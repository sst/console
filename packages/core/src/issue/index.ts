import { createHash } from "crypto";
import { provideActor, useWorkspace } from "../actor";
import { AWS } from "../aws";
import { awsAccount } from "../aws/aws.sql";
import { and, db, eq, inArray, isNull, sql } from "../drizzle";
import { Log } from "../log";
import { app, stage } from "../app/app.sql";
import { issue, issueSubscriber } from "./issue.sql";
import { createId } from "@paralleldrive/cuid2";
import {} from "@smithy/middleware-retry";
import { zod } from "../util/zod";
import { createSelectSchema } from "drizzle-zod";
import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  DescribeSubscriptionFiltersCommand,
  PutDestinationCommand,
  PutDestinationPolicyCommand,
  PutSubscriptionFilterCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-cloudwatch-logs";
import { Resource } from "../app/resource";
import { App } from "../app";
import { z } from "zod";
import { StandardRetryStrategy } from "@smithy/util-retry";
import { RETRY_STRATEGY } from "../util/aws";
import {
  CopyObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Bucket } from "sst/node/bucket";
import { compress } from "../util/compress";
import { benchmark } from "../util/benchmark";

export * as Issue from "./index";

export const Info = createSelectSchema(issue, {});
export type Info = z.infer<typeof Info>;

const s3 = new S3Client({
  retryStrategy: RETRY_STRATEGY,
});

export async function extract(input: {
  logGroup: string;
  logStream: string;
  subscriptionFilters: string[];
  logEvents: {
    id: string;
    timestamp: number;
    message: string;
  }[];
}) {
  const { logGroup, logStream } = input;
  const [filter] = input.subscriptionFilters;
  if (!filter) return;
  const [_prefix, region, accountID, appName, stageName] = filter.split("#");

  const workspaces = await benchmark("workspace_select", () =>
    db
      .select({
        accountID: awsAccount.id,
        workspaceID: awsAccount.workspaceID,
        appID: app.id,
        stageID: stage.id,
      })
      .from(awsAccount)
      .leftJoin(
        app,
        and(eq(app.workspaceID, awsAccount.workspaceID), eq(app.name, appName!))
      )
      .innerJoin(
        stage,
        and(
          eq(stage.workspaceID, app.workspaceID),
          eq(stage.appID, app.id),
          eq(stage.name, stageName!)
        )
      )
      .where(
        and(eq(awsAccount.accountID, accountID!), isNull(awsAccount.timeFailed))
      )
      .execute()
  );

  provideActor({
    type: "system",
    properties: {
      workspaceID: workspaces[0]!.workspaceID,
    },
  });

  const credentials = await benchmark("assume_role", () =>
    AWS.assumeRole(accountID!)
  );
  if (!credentials) return;

  const functionArn =
    `arn:aws:lambda:${region}:${accountID}:function:` +
    input.logGroup.split("/").pop();

  await Promise.all(
    input.logEvents.map(async (event) => {
      const err = Log.extractError(
        event.message.split("\t").map((l) => l.trim())
      );
      if (!err) {
        // console.log("no errors found", event.message);
        return;
      }
      const logs = await benchmark("expand_log", () =>
        Log.expand({
          functionArn,
          logStream,
          logGroup,
          timestamp: event.timestamp,
          region: region!,
          credentials: credentials!,
        })
      );

      const body = await compress(JSON.stringify(logs));

      for (const err of logs) {
        if (err.type !== "error") continue;
        const group = createHash("sha256")
          .update(
            [
              err.error,
              err.message,
              err.stack[0]?.file,
              err.stack[0]?.context?.[0] || err.stack[0]?.raw,
            ]
              .filter(Boolean)
              .join("\n")
          )
          .digest("hex");
        for (const workspace of workspaces) {
          const key = `issues/${workspace.workspaceID}/${group}`;
          await benchmark("put_s3", () =>
            s3.send(
              new PutObjectCommand({
                Key: key,
                Bucket: Bucket.storage.bucketName,
                ContentEncoding: "gzip",
                Body: body,
              })
            )
          );
        }

        await benchmark("insert_issue", () =>
          db
            .insert(issue)
            .values(
              workspaces.map((row) => ({
                group,
                id: createId(),
                errorID: err.id,
                workspaceID: row.workspaceID,
                error: err.error,
                message: err.message,
                stageID: row.stageID,
              }))
            )
            .onDuplicateKeyUpdate({
              set: {
                error: sql`VALUES(error)`,
                errorID: sql`VALUES(error_id)`,
                message: sql`VALUES(message)`,
              },
            })
            .execute()
        );
      }
    })
  );
}

export const subscribe = zod(Info.shape.stageID, async (stageID) => {
  const config = await App.Stage.assumeRole(stageID);
  if (!config) return;

  const uniqueIdentifier = `sst#${config.region}#${config.awsAccountID}#${config.app}#${config.stage}`;
  const cw = new CloudWatchLogsClient({ region: config.region });
  const destination = await cw.send(
    new PutDestinationCommand({
      destinationName: uniqueIdentifier,
      roleArn: process.env.ISSUES_ROLE_ARN,
      targetArn: process.env.ISSUES_STREAM_ARN,
    })
  );
  const userClient = new CloudWatchLogsClient({
    ...config,
    retryStrategy: RETRY_STRATEGY,
  });

  await cw.send(
    new PutDestinationPolicyCommand({
      destinationName: uniqueIdentifier,
      accessPolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              AWS: config.awsAccountID,
            },
            Action: "logs:PutSubscriptionFilter",
            Resource: destination.destination?.arn,
          },
        ],
      }),
    })
  );

  try {
    // Get all function resources
    const functions = await Resource.listFromStageID({
      stageID: stageID,
      types: ["Function"],
    });
    if (!functions.length) return;
    const logGroups = functions.map(
      // @ts-expect-error
      (fn) => `/aws/lambda/${fn.metadata.arn.split(":")[6]}`
    );

    const exists = await db
      .select({
        logGroup: issueSubscriber.logGroup,
      })
      .from(issueSubscriber)
      .where(
        and(
          eq(issueSubscriber.stageID, stageID),
          eq(issueSubscriber.workspaceID, useWorkspace()),
          inArray(issueSubscriber.logGroup, logGroups)
        )
      )
      .execute()
      .then((rows) => new Set(rows.map((row) => row.logGroup)));

    console.log("updating", functions.length, "functions");
    for (const fn of functions) {
      // @ts-expect-error
      const logGroup = `/aws/lambda/${fn.metadata.arn.split(":")[6]}`;
      if (exists.has(logGroup)) continue;
      const createFilter = async () => {
        if (false) {
          const all = await userClient.send(
            new DescribeSubscriptionFiltersCommand({
              logGroupName: logGroup,
            })
          );
          for (const filter of all.subscriptionFilters ?? []) {
            if (
              filter.filterName === uniqueIdentifier &&
              filter.destinationArn === destination.destination?.arn
            ) {
              return;
            }

            if (filter.filterName?.startsWith("sst#")) {
              // TODO: disable for now
              // await userClient.send(
              //   new DeleteSubscriptionFilterCommand({
              //     logGroupName,
              //     filterName: filter.filterName,
              //   })
              // );
              continue;
            }
          }
        }

        await userClient.send(
          new PutSubscriptionFilterCommand({
            destinationArn: destination.destination?.arn,
            filterName: uniqueIdentifier,
            filterPattern: [
              // OOM and other runtime error
              `?"Error: Runtime exited"`,
              // Timeout
              `?"Task timed out after"`,
              // NodeJS Uncaught and console.error
              // @ts-expect-error
              ...(fn.enrichment.runtime?.startsWith("nodejs")
                ? [`?"\tERROR\t"`]
                : []),
            ].join(" "),
            logGroupName: logGroup,
          })
        );
        await db.insert(issueSubscriber).ignore().values({
          stageID,
          workspaceID: useWorkspace(),
          logGroup,
          id: createId(),
        });
      };

      const createLogGroup = () =>
        userClient.send(
          new CreateLogGroupCommand({
            logGroupName: logGroup,
          })
        );

      try {
        await createFilter();
      } catch (e: any) {
        if (
          e instanceof ResourceNotFoundException &&
          e.message.startsWith("The specified log group does not exist")
        ) {
          await createLogGroup();
          await createFilter();
          continue;
        }
        console.error(e);
      }
    }
  } finally {
    cw.destroy();
    userClient.destroy();
  }
});
