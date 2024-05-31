import { z } from "zod";
import { zod } from "../util/zod";
import {
  createTransaction,
  createTransactionEffect,
  useTransaction,
} from "../util/transaction";
import { useWorkspace } from "../actor";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull } from "../drizzle";
import { event } from "../event";
import { Trigger, run } from "./run.sql";
import { App } from "../app";
import { Env } from "../app/env";
import {
  CreateScheduleCommand,
  SchedulerClient,
} from "@aws-sdk/client-scheduler";
import { RETRY_STRATEGY } from "../util/aws";
import { State } from "../state";
import { Architecture } from "@aws-sdk/client-lambda";

export * as Run from "./run";

const BUILD_TIMEOUT = 960000; // 16 minutes

export interface MonitorEvent {
  groupName: string;
  scheduleName: string;
  workspaceID: string;
  runID: string;
  stateUpdateID: string;
}

export const AppConfig = z.object({
  version: z.string().nonempty().optional(),
  name: z.string().nonempty(),
  providers: z.record(z.any()).optional(),
});
export type AppConfig = z.infer<typeof AppConfig>;

export const DeployConfig = z.object({
  stage: z.string().nonempty(),
  runner: z
    .object({
      architecture: z.enum(["x86_64", "arm64"]).default("x86_64"),
    })
    .default({}),
  env: z.record(z.string().nonempty()),
});
export type DeployConfig = z.infer<typeof DeployConfig>;

export const Events = {
  Created: event(
    "run.created",
    z.object({
      runID: z.string().nonempty(),
      stateUpdateID: z.string().nonempty(),
      appID: z.string().nonempty(),
      stageID: z.string().nonempty(),
      awsAccountID: z.string().nonempty(),
      region: z.string().nonempty(),
      cloneUrl: z.string().nonempty(),
      trigger: Trigger,
      appConfig: AppConfig,
      deployConfig: DeployConfig,
    })
  ),
  Started: event(
    "run.started",
    z.object({
      workspaceID: z.string().nonempty(),
      runID: z.string().nonempty(),
      logGroup: z.string().nonempty(),
      logStream: z.string().nonempty(),
      awsRequestId: z.string().nonempty(),
    })
  ),
  Completed: event(
    "run.completed",
    z.object({
      workspaceID: z.string().nonempty(),
      stateUpdateID: z.string().nonempty(),
      runID: z.string().nonempty(),
      error: z.string().nonempty().optional(),
    })
  ),
};

export const create = zod(
  z.object({
    appID: z.string().nonempty(),
    cloneUrl: z.string().nonempty(),
    trigger: Trigger,
    appConfig: AppConfig,
    deployConfig: DeployConfig,
  }),
  async (input) => {
    const appID = input.appID;
    const stageName = input.deployConfig.stage;
    const region = input.appConfig.providers?.aws?.region ?? "us-east-1";

    // Get AWS Account ID from Run Env
    const envs = await Env.listByStage({ appID, stageName });
    const awsAccountID = envs["__AWS_ACCOUNT_ID"];
    if (!awsAccountID) throw new Error("AWS Account ID is not set in Run Env");

    await createTransaction(async (tx) => {
      // Create stage if stage not exist
      let stageID = await App.Stage.fromName({
        appID,
        name: stageName,
        region,
        awsAccountID,
      }).then((s) => s?.id!);

      if (!stageID) {
        console.log("creating stage", { appID, stageID });
        stageID = await App.Stage.connect({
          name: stageName,
          appID,
          region,
          awsAccountID,
        });
      }

      // Create Run
      const runID = createId();
      await tx
        .insert(run)
        .values({
          id: runID,
          workspaceID: useWorkspace(),
          stageID,
          trigger: input.trigger,
        })
        .execute();

      // Create State Update
      const stateUpdateID = createId();
      await State.createUpdate({
        id: stateUpdateID,
        stageID,
        command: "deploy",
        source: {
          type: "ci",
          properties: { runID },
        },
        time: new Date(),
      });

      // Schedule timeout monitor
      const scheduler = new SchedulerClient({ retryStrategy: RETRY_STRATEGY });
      const scheduleName = `run-timeout-${runID}`;

      await createTransactionEffect(() =>
        Promise.allSettled([
          Events.Created.publish({
            runID,
            stateUpdateID,
            stageID,
            awsAccountID,
            region,
            ...input,
          }),
          scheduler.send(
            new CreateScheduleCommand({
              Name: scheduleName,
              GroupName: process.env.SCHEDULE_GROUP_NAME!,
              FlexibleTimeWindow: {
                Mode: "OFF",
              },
              ScheduleExpression: `at(${
                new Date(Date.now() + BUILD_TIMEOUT).toISOString().split(".")[0]
              })`,
              Target: {
                Arn: process.env.TIMEOUT_MONITOR_FUNCTION_ARN,
                RoleArn: process.env.SCHEDULE_ROLE_ARN,
                Input: JSON.stringify({
                  workspaceID: useWorkspace(),
                  runID,
                  stateUpdateID,
                  scheduleName,
                  groupName: process.env.SCHEDULE_GROUP_NAME!,
                } satisfies MonitorEvent),
              },
            })
          ),
        ]).then((results) => {
          const failed = results.find((x) => x.status === "rejected");
          if (failed) {
            console.log("input", input);
            console.log("results", results);
            throw new Error("Failed to create run");
          }
        })
      );
    });
  }
);

export const started = zod(
  z.object({
    runID: z.string().nonempty(),
    awsRequestId: z.string().nonempty(),
    logGroup: z.string().nonempty(),
    logStream: z.string().nonempty(),
  }),
  async (input) =>
    useTransaction((tx) =>
      tx
        .update(run)
        .set({
          timeStarted: new Date(),
          log: {
            type: "lambda",
            requestID: input.awsRequestId,
            logGroup: input.logGroup,
            logStream: input.logStream,
          },
        })
        .where(
          and(eq(run.id, input.runID), eq(run.workspaceID, useWorkspace()))
        )
        .execute()
    )
);

export const completed = zod(
  z.object({
    runID: z.string().cuid2(),
    stateUpdateID: z.string().cuid2(),
    error: z.string().nonempty().optional(),
  }),
  async (input) =>
    useTransaction(async (tx) => {
      const timeCompleted = new Date();
      await tx
        .update(run)
        .set({
          timeCompleted,
          error: input.error,
        })
        .where(
          and(
            eq(run.id, input.runID),
            eq(run.workspaceID, useWorkspace()),
            isNull(run.timeCompleted)
          )
        )
        .execute();
      await State.completeUpdate({
        updateID: input.stateUpdateID,
        time: timeCompleted,
        error: input.error,
      });
    })
);
