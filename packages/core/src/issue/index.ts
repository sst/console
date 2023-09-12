import { createHash } from "crypto";
import { provideActor, useActor, useWorkspace } from "../actor";
import { AWS } from "../aws";
import { awsAccount } from "../aws/aws.sql";
import { and, db, eq, inArray, isNull, sql } from "../drizzle";
import { Log } from "../log";
import { app, stage } from "../app/app.sql";
import { issue, issueCount as issueCount, issueSubscriber } from "./issue.sql";
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
  DeleteSubscriptionFilterCommand,
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
import { createTransaction, useTransaction } from "../util/transaction";
import { DateTime } from "luxon";
import { createPipe, flatMap, groupBy, values } from "remeda";

export * as Issue from "./index";

export const Info = createSelectSchema(issue, {});
export type Info = typeof issue.$inferSelect;
export type Count = typeof issueCount.$inferSelect;

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
  RateLimited: event("issue.rate_limited", {
    stageID: z.string(),
  }),
};

export const ignore = zod(Info.shape.id.array(), async (input) =>
  useTransaction((tx) =>
    tx
      .update(issue)
      .set({
        timeIgnored: sql`now()`,
        ignorer: useActor(),
        timeResolved: null,
        resolver: null,
      })
      .where(
        and(eq(issue.workspaceID, useWorkspace()), inArray(issue.id, input)),
      ),
  ),
);

export const unignore = zod(Info.shape.id.array(), async (input) =>
  useTransaction((tx) =>
    tx
      .update(issue)
      .set({
        timeIgnored: null,
        ignorer: null,
      })
      .where(
        and(eq(issue.workspaceID, useWorkspace()), inArray(issue.id, input)),
      ),
  ),
);

export const resolve = zod(Info.shape.id.array(), async (input) =>
  useTransaction((tx) =>
    tx
      .update(issue)
      .set({
        timeResolved: sql`now()`,
        resolver: useActor(),
        timeIgnored: null,
        ignorer: null,
      })
      .where(
        and(eq(issue.workspaceID, useWorkspace()), inArray(issue.id, input)),
      ),
  ),
);

export const unresolve = zod(Info.shape.id.array(), async (input) =>
  useTransaction((tx) =>
    tx
      .update(issue)
      .set({
        timeResolved: null,
        resolver: null,
      })
      .where(
        and(eq(issue.workspaceID, useWorkspace()), inArray(issue.id, input)),
      ),
  ),
);

export const extract = zod(
  z.custom<(typeof Events.ErrorDetected.shape.properties)["records"][number]>(),
  async (input) => {
    // do not process self
    if (
      input.logGroup.startsWith(
        "/aws/lambda/production-console-Issues-issuesConsumer",
      )
    )
      return;

    const { logStream } = input;
    const [filter] = input.subscriptionFilters;
    if (!filter) return;
    console.log("filter", filter);
    const [_prefix, region, accountID, appName, stageName] = filter.split("#");

    const hour = DateTime.now()
      .startOf("hour")
      .toSQL({ includeOffset: false })!;

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
        and(
          eq(app.workspaceID, awsAccount.workspaceID),
          eq(app.name, appName!),
        ),
      )
      .innerJoin(
        stage,
        and(
          eq(stage.workspaceID, app.workspaceID),
          eq(stage.appID, app.id),
          eq(stage.name, stageName!),
        ),
      )
      .where(
        and(
          eq(awsAccount.accountID, accountID!),
          isNull(awsAccount.timeFailed),
        ),
      )
      .execute();

    if (!workspaces.length) return;

    const count = await db
      .select({
        total: sql<number>`SUM(${issueCount.count})`,
      })
      .from(issueCount)
      .where(
        and(
          eq(issueCount.workspaceID, workspaces[0]!.workspaceID),
          eq(issueCount.stageID, workspaces[0]!.stageID),
        ),
      )
      .execute()
      .then((rows) => rows.at(0)?.total || 0);

    console.log("rate limit", count);

    if (count > 5) {
      for (const workspace of workspaces) {
        provideActor({
          type: "system",
          properties: {
            workspaceID: workspace.workspaceID,
          },
        });
        await Events.RateLimited.publish({ stageID: workspace.stageID });
      }
      return;
    }

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
    const errors = await Promise.allSettled(
      input.logEvents.map(async (event) => {
        const err = await Log.extractError(
          sourcemapCache,
          event.timestamp,
          event.message.split(`\t`).map((x) => x.trim()),
        );
        if (!err) return;

        if (!err.error) {
          console.log("error was undefined for some reason");
          console.log("log event", event);
          return;
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

        return {
          group,
          timestamp: event.timestamp,
          err,
        };
      }),
    ).then(
      createPipe(
        flatMap((item) => {
          return item.status === "fulfilled" && item.value ? [item.value] : [];
        }),
        groupBy((item) => item.group),
        values,
      ),
    );

    if (errors.length === 0) return;

    for (const items of errors) {
      const [item] = items;
      console.log(
        "found error",
        item.err.error,
        item.err.message,
        item.timestamp,
        items.length,
      );
    }

    await createTransaction(async (tx) => {
      await tx
        .insert(issue)
        .values(
          errors.flatMap((items) =>
            workspaces.map((row) => ({
              group: items[0].group,
              stack: items[0].err.stack,
              id: createId(),
              errorID: "none",
              pointer: {
                timestamp: items[0].timestamp,
                logGroup: input.logGroup,
                logStream: logStream,
              },
              workspaceID: row.workspaceID,
              error: items[0].err.error,
              message: items[0].err.message,
              count: items.length,
              stageID: row.stageID,
              timeSeen: sql`now()`,
              timeResolved: null,
              resolver: null,
            })),
          ),
        )
        .onDuplicateKeyUpdate({
          set: {
            error: sql`VALUES(error)`,
            count: sql`count + VALUES(count)`,
            errorID: sql`VALUES(error_id)`,
            message: sql`VALUES(message)`,
            stack: sql`VALUES(stack)`,
            timeUpdated: sql`CURRENT_TIMESTAMP()`,
            pointer: sql`VALUES(pointer)`,
            timeSeen: sql`VALUES(time_seen)`,
            timeResolved: null,
            resolver: null,
          },
        })
        .execute();

      await tx
        .insert(issueCount)
        .values(
          errors.flatMap((items) =>
            workspaces.map((row) => ({
              id: createId(),
              hour,
              stageID: row.stageID,
              count: items.length,
              workspaceID: row.workspaceID,
              group: items[0].group,
            })),
          ),
        )
        .onDuplicateKeyUpdate({
          set: {
            count: sql`count + VALUES(count)`,
          },
        })
        .execute();
    });

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
  },
);

function destinationIdentifier(config: StageCredentials) {
  return `sst#${config.region}#${config.awsAccountID}#${config.app}#${config.stage}`;
}

export const connectStage = zod(
  z.custom<StageCredentials>(),
  async (config) => {
    const uniqueIdentifier = destinationIdentifier(config);
    console.log(
      "creating",
      uniqueIdentifier,
      Config.ISSUES_ROLE_ARN,
      Config.ISSUES_STREAM_ARN,
    );
    const cw = new CloudWatchLogsClient({
      region: config.region,
      retryStrategy: RETRY_STRATEGY,
    });

    try {
      const destination = await cw.send(
        new PutDestinationCommand({
          destinationName: uniqueIdentifier,
          roleArn: Config.ISSUES_ROLE_ARN,
          targetArn: Config.ISSUES_STREAM_ARN,
        }),
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
        }),
      );
    } finally {
      cw.destroy();
    }
  },
);

export const subscribe = zod(z.custom<StageCredentials>(), async (config) => {
  const uniqueIdentifier = destinationIdentifier(config);
  const destination =
    Config.ISSUES_DESTINATION_PREFIX.replace("<region>", config.region) +
    uniqueIdentifier;
  const cw = new CloudWatchLogsClient({
    region: config.region,
    credentials: config.credentials,
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
          eq(issueSubscriber.workspaceID, useWorkspace()),
        ),
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
            }),
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

          await Warning.remove({
            target: fn.id,
            type: "log_subscription",
            stageID: config.stageID,
          });

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
                }),
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

export const unsubscribe = zod(z.custom<StageCredentials>(), async (config) => {
  const uniqueIdentifier = destinationIdentifier(config);
  const cw = new CloudWatchLogsClient({
    region: config.region,
    credentials: config.credentials,
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
          eq(issueSubscriber.workspaceID, useWorkspace()),
        ),
      )
      .execute()
      .then((rows) => new Set(rows.map((x) => x.functionID)));

    console.log("updating", functions.length, "functions");
    for (const fn of functions) {
      if (!exists.has(fn.id)) continue;
      // @ts-expect-error
      const logGroup = `/aws/lambda/${fn.metadata.arn.split(":")[6]}`;
      console.log("unsubscribing", logGroup);

      while (true) {
        try {
          await cw.send(
            new DeleteSubscriptionFilterCommand({
              filterName: uniqueIdentifier,
              logGroupName: logGroup,
            }),
          );

          await db
            .delete(issueSubscriber)
            .where(
              and(
                eq(issueSubscriber.workspaceID, useWorkspace()),
                eq(issueSubscriber.stageID, config.stageID),
                eq(issueSubscriber.functionID, fn.id),
              ),
            )
            .execute();

          await Warning.create({
            stageID: config.stageID,
            target: fn.id,
            type: "log_subscription",
            data: {
              error: "noisy",
            },
          });

          break;
        } catch (e: any) {
          console.error(e);
          break;
        }
      }
    }
  } finally {
    cw.destroy();
  }
});
