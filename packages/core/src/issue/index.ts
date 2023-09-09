import { createHash } from "crypto";
import { provideActor, useWorkspace } from "../actor";
import { AWS } from "../aws";
import { awsAccount } from "../aws/aws.sql";
import { and, db, eq, inArray, isNull, sql } from "../drizzle";
import { Log } from "../log";
import { app, stage } from "../app/app.sql";
import { issue, issueCounts as issueCount, issueSubscriber } from "./issue.sql";
import { createId } from "@paralleldrive/cuid2";
import {} from "@smithy/middleware-retry";
import { zod } from "../util/zod";
import { createSelectSchema } from "drizzle-zod";
import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  LimitExceededException,
  PutDestinationCommand,
  PutDestinationPolicyCommand,
  PutSubscriptionFilterCommand,
  ResourceAlreadyExistsException,
  ResourceNotFoundException,
} from "@aws-sdk/client-cloudwatch-logs";
import { Resource } from "../app/resource";
import { z } from "zod";
import { RETRY_STRATEGY } from "../util/aws";
import { StageCredentials } from "../app/stage";
import { event } from "../event";
import { Config } from "sst/node/config";
import { Warning } from "../warning";
import { Replicache } from "../replicache";
import { createTransaction } from "../util/transaction";
import { DateTime } from "luxon";

export * as Issue from "./index";

export const Info = createSelectSchema(issue, {});
export type Info = typeof issue.$inferSelect;

export const Events = {
  ErrorDetected: event("issue.error_detected", {
    records: z
      .object({
        logGroup: z.string(),
        logStream: z.string(),
        subscriptionFilters: z.string().array(),
        logEvents: z
          .object({
            id: z.string(),
            timestamp: z.number(),
            message: z.string(),
          })
          .array(),
      })
      .array(),
  }),
};

export const extract = zod(
  z.custom<(typeof Events.ErrorDetected.shape.properties)["records"][number]>(),
  async (input) => {
    // do not process self
    if (input.logGroup.startsWith("/aws/lambda/production-console-Issues"))
      return;

    const { logStream } = input;
    const [filter] = input.subscriptionFilters;
    if (!filter) return;
    console.log("filter", filter);
    const [_prefix, region, accountID, appName, stageName] = filter.split("#");

    const workspaces = await db
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
      .execute();

    if (!workspaces.length) return;

    provideActor({
      type: "system",
      properties: {
        workspaceID: workspaces[0]!.workspaceID,
      },
    });

    const credentials = await AWS.assumeRole(accountID!);
    if (!credentials) return;

    const functionArn =
      `arn:aws:lambda:${region}:${accountID}:function:` +
      input.logGroup.split("/").pop();

    console.log("functionArn", functionArn);

    const sourcemapCache = Log.createSourcemapCache({
      functionArn,
      config: {
        credentials: credentials,
        stageID: workspaces[0]!.stageID,
        app: appName!,
        stage: stageName!,
        awsAccountID: accountID!,
        region: region!,
      },
    });
    await Promise.allSettled(
      input.logEvents.map(async (event) => {
        const err = await Log.extractError(
          sourcemapCache,
          event.timestamp,
          event.message.split(`\t`).map((x) => x.trim())
        );
        if (!err) return;

        if (!err.stack.length) {
          // console.log("no stack", event.message);
        }

        const group = (() => {
          const frames = err.stack
            .map((x) => {
              if (x.file) {
                return x.context?.[3] || x.file;
              }

              return x.raw!;
            })
            .map((x) => x.trim());
          const parts = [err.error, frames[0]].filter(Boolean).join("\n");

          return createHash("sha256").update(parts).digest("hex");
        })();

        console.log("found error", err.error, err.message);

        await createTransaction(async (tx) => {
          await tx
            .insert(issue)
            .values(
              workspaces.map((row) => ({
                group,
                stack: err.stack,
                id: createId(),
                errorID: "none",
                pointer: {
                  timestamp: event.timestamp,
                  logGroup: input.logGroup,
                  logStream: logStream,
                },
                workspaceID: row.workspaceID,
                error: err.error,
                message: err.message,
                count: 1,
                stageID: row.stageID,
              }))
            )
            .onDuplicateKeyUpdate({
              set: {
                error: sql`VALUES(error)`,
                count: sql`count + 1`,
                errorID: sql`VALUES(error_id)`,
                message: sql`VALUES(message)`,
                timeUpdated: sql`CURRENT_TIMESTAMP()`,
              },
            })
            .execute();

          const inserted = await tx
            .select({
              id: issue.id,
              workspaceID: issue.workspaceID,
            })
            .from(issue)
            .where(
              and(
                inArray(
                  sql`(${issue.workspaceID}, ${issue.stageID})`,
                  workspaces.map((row) => [row.workspaceID, row.stageID])
                ),
                eq(issue.group, group)
              )
            )
            .execute();

          const hour = DateTime.now()
            .startOf("hour")
            .toSQL({ includeOffset: false })!;

          const result = await tx
            .insert(issueCount)
            .values(
              inserted.map((item) => ({
                workspaceID: item.workspaceID,
                issueID: item.id,
                count: 1,
                hour,
                id: createId(),
              }))
            )
            .onDuplicateKeyUpdate({
              set: {
                count: sql`count + 1`,
              },
            })
            .execute();
        });
      })
    );

    sourcemapCache.destroy();

    for (const row of workspaces) {
      provideActor({
        type: "system",
        properties: {
          workspaceID: row.workspaceID,
        },
      });
      // await Replicache.poke();
    }
  }
);

function destinationIdentifier(config: StageCredentials) {
  return `sst#${config.region}#${config.awsAccountID}#${config.app}#${config.stage}`;
}

export const connectStage = zod(
  z.custom<StageCredentials>(),
  async (config) => {
    const uniqueIdentifier = destinationIdentifier(config);
    console.log("creating", uniqueIdentifier);
    const cw = new CloudWatchLogsClient({
      region: config.region,
      retryStrategy: RETRY_STRATEGY,
    });

    const destination = await cw.send(
      new PutDestinationCommand({
        destinationName: uniqueIdentifier,
        roleArn: Config.ISSUES_ROLE_ARN,
        targetArn: Config.ISSUES_STREAM_ARN,
      })
    );

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
              Resource: destination.destination!.arn,
            },
          ],
        }),
      })
    );

    cw.destroy();
  }
);

export const subscribe = zod(z.custom<StageCredentials>(), async (config) => {
  const uniqueIdentifier = destinationIdentifier(config);
  const destination =
    Config.ISSUES_DESTINATION_PREFIX.replace("<region>", config.region) +
    uniqueIdentifier;
  const cw = new CloudWatchLogsClient({
    ...config,
    retryStrategy: RETRY_STRATEGY,
  });

  try {
    // Get all function resources
    const functions = await Resource.listFromStageID({
      stageID: config.stageID,
      types: ["Function"],
    });
    if (!functions.length) return;

    const exists = await db
      .select({
        functionID: issueSubscriber.functionID,
      })
      .from(issueSubscriber)
      .where(
        and(
          eq(issueSubscriber.stageID, config.stageID),
          eq(issueSubscriber.workspaceID, useWorkspace())
        )
      )
      .execute()
      .then((rows) => new Set(rows.map((x) => x.functionID)));

    console.log("updating", functions.length, "functions");
    for (const fn of functions) {
      if (exists.has(fn.id)) continue;
      // @ts-expect-error
      const logGroup = `/aws/lambda/${fn.metadata.arn.split(":")[6]}`;
      console.log("subscribing", logGroup);

      while (true) {
        try {
          await cw.send(
            new PutSubscriptionFilterCommand({
              destinationArn: destination,
              filterName: uniqueIdentifier,
              filterPattern: [
                `?"Invoke Error"`,
                // OOM and other runtime error
                `?"Error: Runtime exited"`,
                // Timeout
                `?"Task timed out after"`,
                // NodeJS Uncaught and console.error
                `?"\tERROR\t"`,
                // ...(fn.enrichment.runtime?.startsWith("nodejs")
                //   ? [`?"\tERROR\t"`]
                //   : []),
              ].join(" "),
              logGroupName: logGroup,
            })
          );

          await db
            .insert(issueSubscriber)
            .ignore()
            .values({
              stageID: config.stageID,
              workspaceID: useWorkspace(),
              functionID: fn.id,
              id: createId(),
            })
            .execute();
          break;
        } catch (e: any) {
          // Create log group if the function has never been invoked
          if (
            e instanceof ResourceNotFoundException &&
            e.message.startsWith("The specified log group does not exist")
          ) {
            console.log("creating log group");
            await cw
              .send(
                new CreateLogGroupCommand({
                  logGroupName: logGroup,
                })
              )
              .catch((e) => {
                if (e instanceof ResourceAlreadyExistsException) return;
                throw e;
              });
            continue;
          }

          // There are too many log subscribers
          if (e instanceof LimitExceededException) {
            await Warning.create({
              stageID: config.stageID,
              target: fn.id,
              type: "log_subscription",
              data: {
                error: "limited",
              },
            });
            break;
          }

          // Permissions issue
          if (e.name === "AccessDeniedException") {
            await Warning.create({
              stageID: config.stageID,
              target: fn.id,
              type: "log_subscription",
              data: {
                error: "permissions",
              },
            });
            break;
          }

          // The destination hasn't been created yet so try again
          if (
            e instanceof ResourceNotFoundException &&
            e.message === "The specified destination does not exist."
          ) {
            await connectStage(config);
            continue;
          }

          console.error(e);
          await Warning.create({
            stageID: config.stageID,
            target: fn.id,
            type: "log_subscription",
            data: {
              error: "unknown",
              message: e.toString(),
            },
          });
          break;
        }
      }
    }
  } finally {
    cw.destroy();
  }
});
