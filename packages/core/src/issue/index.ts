import { createHash } from "crypto";
import { provideActor, useWorkspace } from "../actor";
import { AWS } from "../aws";
import { awsAccount } from "../aws/aws.sql";
import { and, db, eq, isNull, sql } from "../drizzle";
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
  LimitExceededException,
  PutDestinationCommand,
  PutDestinationPolicyCommand,
  PutSubscriptionFilterCommand,
  ResourceAlreadyExistsException,
  ResourceNotFoundException,
} from "@aws-sdk/client-cloudwatch-logs";
import { Resource } from "../app/resource";
import { App } from "../app";
import { z } from "zod";
import { RETRY_STRATEGY } from "../util/aws";
import { StageCredentials } from "../app/stage";
import { event } from "../event";
import { Config } from "sst/node/config";
import { Warning } from "../warning";

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

    await Promise.all(
      input.logEvents.map(async (event) => {
        const processor = Log.createProcessor({
          arn: functionArn,
          config: {
            credentials: credentials,
            app: appName!,
            stage: stageName!,
            awsAccountID: accountID!,
            region: region!,
          },
          group: input.logGroup,
        });

        await processor.process({
          id: event.id,
          timestamp: event.timestamp,
          line: event.message,
          streamName: logStream,
        });
        const err = processor.streams
          .get(logStream)
          ?.unknown.map((x) => x.type === "error" && x)
          .at(0);
        processor.destroy();
        if (!err) return;

        const group = (() => {
          const frames = err.stack
            .flatMap((x) => {
              if (x.file) {
                if (!x.important) return [];
                return x.context?.[3] || x.file;
              }

              return x.raw!;
            })
            .map((x) => x.trim());
          const parts = [err.type, frames[0], ...frames.slice(1, 4).sort()]
            .filter(Boolean)
            .join("\n");

          return createHash("sha256").update(parts).digest("hex");
        })();

        console.log("found error", err.error, err.message);

        await db
          .insert(issue)
          .values(
            workspaces.map((row) => ({
              group,
              stack: err.stack,
              id: createId(),
              errorID: "none",
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
              timeUpdated: sql`CURRENT_TIMESTAMP()`,
            },
          })
          .execute();
      })
    );
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
  }
);

export const subscribe = zod(Info.shape.stageID, async (stageID) => {
  const config = await App.Stage.assumeRole(stageID);
  if (!config) return;

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
      stageID: stageID,
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
          eq(issueSubscriber.stageID, stageID),
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
              stageID: stageID,
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
              stageID,
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
              stageID,
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
            stageID,
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
