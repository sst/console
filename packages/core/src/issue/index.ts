export * as Issue from "./index";
export * from "./extract";

import { useActor, useWorkspace } from "../actor";
import { and, db, eq, inArray, not, sql } from "../drizzle";
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
  DeleteDestinationCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { Resource } from "../app/resource";
import { z } from "zod";
import { RETRY_STRATEGY } from "../util/aws";
import { StageCredentials } from "../app/stage";
import { event } from "../event";
import { Config } from "sst/node/config";
import { Warning } from "../warning";
import { useTransaction } from "../util/transaction";

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
      retryStrategy: RETRY_STRATEGY,
    });

    try {
      await cw.send(
        new DeleteDestinationCommand({
          destinationName: uniqueIdentifier,
        })
      );
    } catch (ex) {
      if (ex instanceof ResourceNotFoundException) return;
      throw ex;
    } finally {
      cw.destroy();
    }
  }
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
                `?"[ERROR]"`,
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
