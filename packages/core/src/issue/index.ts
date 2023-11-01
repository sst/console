export * as Issue from "./index";
export * from "./extract";

import { useActor, useWorkspace } from "../actor";
import { and, db, eq, inArray, lt, not, sql } from "../drizzle";
import {
  issue,
  issueAlertLimit,
  issueCount as issueCount,
  issueSubscriber,
} from "./issue.sql";
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
  DeleteDestinationCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { Resource } from "../app/resource";
import { z } from "zod";
import { RETRY_STRATEGY } from "../util/aws";
import { Stage, StageCredentials } from "../app/stage";
import { event } from "../event";
import { Config } from "sst/node/config";
import { Warning } from "../warning";
import { useTransaction } from "../util/transaction";
import { Log } from "../log";

export const Info = createSelectSchema(issue, {});
export type Info = typeof issue.$inferSelect;
export type Count = typeof issueCount.$inferSelect;
export { Alert } from "./alert";

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
  IssueDetected: event("issue.detected", {
    stageID: z.string(),
    group: z.string(),
  }),
  SubscribeRequested: event("issue.subscribe_requested", {
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
        and(eq(issue.workspaceID, useWorkspace()), inArray(issue.id, input))
      )
  )
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
        and(eq(issue.workspaceID, useWorkspace()), inArray(issue.id, input))
      )
  )
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
        and(eq(issue.workspaceID, useWorkspace()), inArray(issue.id, input))
      )
  )
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
        and(eq(issue.workspaceID, useWorkspace()), inArray(issue.id, input))
      )
  )
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
      config.region,
      uniqueIdentifier,
      Config.ISSUES_ROLE_ARN,
      Config.ISSUES_STREAM_ARN
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
    } finally {
      cw.destroy();
    }
  }
);

export const disconnectStage = zod(
  z.custom<StageCredentials>(),
  async (config) => {
    const uniqueIdentifier = destinationIdentifier(config);
    console.log("deleting", uniqueIdentifier);
    const cw = new CloudWatchLogsClient({
      region: config.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        sessionToken: process.env.AWS_SESSION_TOKEN!,
      },
      // retryStrategy: RETRY_STRATEGY,
    });

    try {
      await cw.send(
        new DeleteDestinationCommand({
          destinationName: uniqueIdentifier,
        })
      );
    } catch (ex: any) {
      if (ex instanceof ResourceNotFoundException) return;
      if (ex.name === "ThrottlingException") return;
      throw ex;
    } finally {
      cw.destroy();
    }
  }
);

export const subscribe = zod(z.custom<StageCredentials>(), async (config) => {
  const warnings = await Warning.forType({
    stageID: config.stageID,
    type: "issue_rate_limited",
  });
  if (warnings.length) return;
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
    const resources = await Resource.listFromStageID({
      stageID: config.stageID,
      types: ["Function", "NextjsSite"],
    });
    const functions = resources.filter((x) => x.type === "Function");
    if (!functions.length) return;

    await db.delete(issueSubscriber).where(
      and(
        eq(issueSubscriber.workspaceID, useWorkspace()),
        eq(issueSubscriber.stageID, config.stageID),
        not(
          inArray(
            issueSubscriber.functionID,
            functions.map((x) => x.id)
          )
        )
      )
    );

    const exists = await db
      .select({
        functionID: issueSubscriber.functionID,
        logGroup: issueSubscriber.logGroup,
      })
      .from(issueSubscriber)
      .where(
        and(
          eq(issueSubscriber.stageID, config.stageID),
          eq(issueSubscriber.workspaceID, useWorkspace())
        )
      )
      .execute();

    console.log("updating", resources.length, "functions");
    async function subscribe(logGroup: string, functionID: string) {
      if (
        exists.find(
          (item) => item.functionID === functionID && item.logGroup === logGroup
        )
      )
        return;
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
                `?"[ERROR]"`,
                // ...(fn.enrichment.runtime?.startsWith("nodejs")
                //   ? [`?"\tERROR\t"`]
                //   : []),
              ].join(" "),
              logGroupName: logGroup,
            })
          );

          if (functionID)
            await db
              .insert(issueSubscriber)
              .ignore()
              .values({
                stageID: config.stageID,
                workspaceID: useWorkspace(),
                functionID: functionID,
                id: createId(),
                logGroup,
              })
              .execute();

          await Warning.remove({
            target: logGroup,
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
              target: logGroup,
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
              target: logGroup,
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
            target: logGroup,
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

    for (const resource of resources) {
      if (resource.type === "Function") {
        const logGroup = `/aws/lambda/${resource.metadata.arn.split(":")[6]}`;
        await subscribe(logGroup, resource.id);
      }

      if (resource.type === "NextjsSite") {
        const routes = resource.metadata.routes?.data;
        if (!routes) continue;
        const fn = resources.find(
          (r) =>
            r.type === "Function" && r.metadata.arn === resource.metadata.server
        );
        if (!fn) continue;

        for (const route of routes) {
          const logGroup =
            resource.metadata.routes?.logGroupPrefix + route.logGroupPath;
          await subscribe(logGroup, fn.id);
        }
      }
    }
    await Warning.remove({
      target: "none",
      type: "issue_rate_limited",
      stageID: config.stageID,
    });
  } finally {
    cw.destroy();
  }
});

export const unsubscribe = zod(z.custom<StageCredentials>(), async (config) => {
  await disconnectStage(config);
  await db
    .delete(issueSubscriber)
    .where(
      and(
        eq(issueSubscriber.workspaceID, useWorkspace()),
        eq(issueSubscriber.stageID, config.stageID)
      )
    )
    .execute();
  await Warning.create({
    target: "none",
    type: "issue_rate_limited",
    stageID: config.stageID,
    data: {},
  });
  return;
});

export async function cleanup() {
  {
    const result = await db
      .delete(issue)
      .where(lt(issue.timeSeen, sql`now() - interval 30 day`));
    console.log("deleted", result.rowsAffected, "issues");
  }

  {
    const result = await db
      .delete(issueCount)
      .where(lt(issueCount.hour, sql`now() - interval 24 hour`));
    console.log("deleted", result.rowsAffected, "issue counts");
  }

  {
    const result = await db
      .delete(issueCount)
      .where(lt(issueCount.hour, sql`now() - interval 24 hour`));
    console.log("deleted", result.rowsAffected, "issue counts");
  }

  {
    const result = await db
      .delete(issueAlertLimit)
      .where(lt(issueAlertLimit.timeUpdated, sql`now() - interval 24 hour`));
    console.log("deleted", result.rowsAffected, "issue alert limit");
  }
}

export const expand = zod(
  Info.pick({
    stageID: true,
    group: true,
  }),
  async (input) => {
    const config = await Stage.assumeRole(input.stageID);
    if (!config) return;
    const row = await db
      .select({
        id: issue.id,
        pointer: issue.pointer,
      })
      .from(issue)
      .where(
        and(
          eq(issue.workspaceID, useWorkspace()),
          eq(issue.stageID, input.stageID),
          eq(issue.group, input.group)
        )
      )
      .limit(1)
      .then((rows) => rows.at(0));
    if (!row?.pointer) return;
    const { pointer } = row;
    console.log("expanding", pointer);
    const [invocation] = await Log.expand({
      group: "group",
      logGroup: pointer.logGroup,
      logStream: pointer.logStream,
      timestamp: pointer.timestamp,
      sourcemapKey:
        `arn:aws:lambda:${config.region}:${config.awsAccountID}:function:` +
        pointer.logGroup.split("/").slice(3, 5).join("/"),
      config,
    });
    if (!invocation) return;

    await db
      .update(issue)
      .set({
        invocation,
      })
      .where(and(eq(issue.workspaceID, useWorkspace()), eq(issue.id, row.id)));
  }
);
