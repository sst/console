import { createHash } from "crypto";
import { z } from "zod";
import {
  CreateScheduleCommand,
  SchedulerClient,
} from "@aws-sdk/client-scheduler";
import {
  CreateFunctionCommand,
  GetFunctionCommand,
  InvokeCommand,
  LambdaClient,
  PutFunctionEventInvokeConfigCommand,
} from "@aws-sdk/client-lambda";
import {
  AttachRolePolicyCommand,
  PutRolePolicyCommand,
  CreateRoleCommand,
  GetRoleCommand,
  IAMClient,
} from "@aws-sdk/client-iam";
import {
  EventBridgeClient,
  PutRuleCommand,
  PutTargetsCommand,
} from "@aws-sdk/client-eventbridge";
import { Config } from "sst/node/config";
import { Bucket } from "sst/node/bucket";
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
import {
  Architecture,
  Log,
  Resource,
  Trigger,
  runRunnerTable,
  runTable,
} from "./run.sql";
import { App } from "../app";
import { Env } from "../app/env";
import { RETRY_STRATEGY } from "../util/aws";
import { State } from "../state";
import { StageCredentials } from "../app/stage";

export module Run {
  const BUILD_TIMEOUT = 960000; // 16 minutes

  export interface MonitorEvent {
    groupName: string;
    scheduleName: string;
    workspaceID: string;
    runID: string;
    stateUpdateID: string;
  }

  export type RunnerEvent = {
    runID: string;
    workspaceID: string;
    stateUpdateID: string;
    stage: string;
    cloneUrl: string;
    buildspec: {
      version: string;
      bucket: string;
    };
    credentials: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken: string;
    };
    trigger: Trigger;
  };

  export const AppConfig = z.object({
    version: z.string().nonempty().optional(),
    name: z.string().nonempty(),
    providers: z.record(z.any()).optional(),
  });

  export const DeployConfig = z.object({
    stage: z.string().nonempty(),
    runner: z
      .object({
        architecture: z.enum(["x86_64", "arm64"]).default("x86_64"),
      })
      .default({}),
    env: z.record(z.string().nonempty()),
  });

  export const Event = {
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

  export const Run = z.object({
    id: z.string().cuid2(),
    stageID: z.string().cuid2(),
    time: z.object({
      created: z.string(),
      deleted: z.string().optional(),
      updated: z.string(),
      started: z.string().optional(),
      completed: z.string().optional(),
    }),
    log: Log.optional(),
    trigger: Trigger,
    error: z.string().optional(),
  });
  export type Run = z.infer<typeof Run>;

  export function serializeRun(input: typeof runTable.$inferSelect): Run {
    return {
      id: input.id,
      stageID: input.stageID,
      time: {
        created: input.timeCreated.toISOString(),
        updated: input.timeUpdated.toISOString(),
        deleted: input.timeDeleted?.toISOString(),
        started: input.timeStarted?.toISOString(),
        completed: input.timeCompleted?.toISOString(),
      },
      log: input.log || undefined,
      trigger: input.trigger,
      error: input.error || undefined,
    };
  }

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
      if (!awsAccountID)
        throw new Error("AWS Account ID is not set in Run Env");

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
          .insert(runTable)
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
        const scheduler = new SchedulerClient({
          retryStrategy: RETRY_STRATEGY,
        });
        const scheduleName = `run-timeout-${runID}`;

        await createTransactionEffect(() =>
          Promise.allSettled([
            Event.Created.publish({
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
                  new Date(Date.now() + BUILD_TIMEOUT)
                    .toISOString()
                    .split(".")[0]
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
          .update(runTable)
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
            and(
              eq(runTable.id, input.runID),
              eq(runTable.workspaceID, useWorkspace())
            )
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
          .update(runTable)
          .set({
            timeCompleted,
            error: input.error,
          })
          .where(
            and(
              eq(runTable.id, input.runID),
              eq(runTable.workspaceID, useWorkspace()),
              isNull(runTable.timeCompleted)
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

  export const getRunner = zod(
    z.object({
      region: z.string().nonempty(),
      awsAccountID: z.string().cuid2(),
      architecture: z.enum(Architecture),
      image: z.string().nonempty(),
    }),
    async (input) => {
      return await useTransaction((tx) =>
        tx
          .select()
          .from(runRunnerTable)
          .where(
            and(
              eq(runRunnerTable.workspaceID, useWorkspace()),
              eq(runRunnerTable.awsAccountID, input.awsAccountID),
              eq(runRunnerTable.region, input.region),
              eq(runRunnerTable.architecture, input.architecture),
              eq(runRunnerTable.image, input.image)
            )
          )
          .execute()
          .then((x) => x[0])
      );
    }
  );

  export const createRunner = zod(
    z.object({
      region: z.string().nonempty(),
      awsAccountID: z.string().cuid2(),
      architecture: z.enum(Architecture),
      image: z.string().nonempty(),
      config: z.custom<StageCredentials>(),
    }),
    async (input) => {
      const { region, config, architecture, image } = input;
      const suffix =
        architecture +
        "-" +
        createHash("sha256")
          .update(`lambda${architecture}${image}`)
          .digest("hex")
          .substring(0, 8) +
        (Config.STAGE !== "production" ? "-" + Config.STAGE : "");

      const roleArn = await createIamRole();
      const functionArn = await createFunction();
      await createEventTarget();

      const resource = {
        type: "lambda" as const,
        properties: {
          role: roleArn,
          function: functionArn,
        },
      };

      await useTransaction(async (tx) =>
        tx
          .insert(runRunnerTable)
          .values({
            id: createId(),
            workspaceID: useWorkspace(),
            awsAccountID: input.awsAccountID,
            region,
            architecture: input.architecture,
            image: input.image,
            resource,
          })
          .execute()
      );

      return resource;

      async function createIamRole() {
        const iam = new IAMClient({ ...config, retryStrategy: RETRY_STRATEGY });
        const roleName = `sst-runner-${region}-${suffix}`;
        try {
          const ret = await iam.send(
            new CreateRoleCommand({
              RoleName: roleName,
              AssumeRolePolicyDocument: JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                  {
                    Effect: "Allow",
                    Principal: {
                      Service: "lambda.amazonaws.com",
                    },
                    Action: "sts:AssumeRole",
                  },
                ],
              }),
            })
          );
          await iam.send(
            new PutRolePolicyCommand({
              RoleName: roleName,
              PolicyName: "eventbridge",
              PolicyDocument: JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                  {
                    Effect: "Allow",
                    Action: "events:PutEvents",
                    Resource: "*",
                  },
                ],
              }),
            })
          );
          await iam.send(
            new AttachRolePolicyCommand({
              RoleName: roleName,
              PolicyArn:
                "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            })
          );
          return ret.Role?.Arn!;
        } catch (e: any) {
          if (e.name !== "EntityAlreadyExistsException") {
            throw e;
          }

          return await iam
            .send(
              new GetRoleCommand({
                RoleName: roleName,
              })
            )
            .then((ret) => ret.Role?.Arn!);
        }
      }

      async function createFunction() {
        const lambda = new LambdaClient({
          ...config,
          region,
          retryStrategy: RETRY_STRATEGY,
        });
        const functionName = `sst-runner-${suffix}`;
        try {
          const ret = await lambda.send(
            new CreateFunctionCommand({
              FunctionName: functionName,
              Role: roleArn,
              Code: { ImageUri: input.image },
              Timeout: 900,
              MemorySize: 10240,
              EphemeralStorage: {
                Size: 10240,
              },
              PackageType: "Image",
              Architectures: ["x86_64"],
            })
          );

          await lambda.send(
            new PutFunctionEventInvokeConfigCommand({
              FunctionName: ret.FunctionArn!,
              MaximumRetryAttempts: 0,
              MaximumEventAgeInSeconds: 3600,
            })
          );
        } catch (e: any) {
          if (e.name === "InvalidParameterValueException")
            return createFunction();
          if (e.name === "ResourceConflictException") {
            // ignore
          }
          throw e;
        }

        // Wait or function state is ACTIVE
        while (true) {
          const ret = await lambda.send(
            new GetFunctionCommand({
              FunctionName: functionName,
            })
          );

          if (ret.Configuration?.State !== "Pending") {
            return ret.Configuration?.FunctionArn!;
          }
          await new Promise((r) => setTimeout(r, 5000));
        }
      }

      async function createEventTarget() {
        const eb = new EventBridgeClient({
          ...config,
          region,
          retryStrategy: RETRY_STRATEGY,
        });
        const ruleName = "SSTConsoleExternal" + suffix;
        try {
          await eb.send(
            new PutRuleCommand({
              Name: ruleName,
              State: "ENABLED",
              EventPattern: JSON.stringify({
                source: ["sst.external"],
              }),
            })
          );

          const iam = new IAMClient(config);
          const roleName = "SSTConsolePublisher" + suffix;
          const roleRet = await iam.send(
            new GetRoleCommand({
              RoleName: roleName,
            })
          );

          await eb.send(
            new PutTargetsCommand({
              Rule: ruleName,
              Targets: [
                {
                  Arn: process.env.EVENT_BUS_ARN,
                  Id: "SSTConsoleExternal",
                  RoleArn: roleRet.Role?.Arn!,
                },
              ],
            })
          );
        } catch (e: any) {
          if (e.name !== "ResourceConflictException") {
            throw e;
          }
        }
      }
    }
  );

  export const invokeRunner = zod(
    z.object({
      region: z.string().nonempty(),
      resource: Resource,
      runID: z.string().cuid2(),
      stateUpdateID: z.string().cuid2(),
      config: z.custom<StageCredentials>(),
      stage: z.string().nonempty(),
      cloneUrl: z.string().nonempty(),
      trigger: Trigger,
    }),
    async (input) => {
      const region = input.region;
      const config = input.config;

      const lambda = new LambdaClient({
        ...config,
        region,
        retryStrategy: RETRY_STRATEGY,
      });
      await lambda.send(
        new InvokeCommand({
          FunctionName: input.resource.properties.function,
          InvocationType: "Event",
          Payload: JSON.stringify({
            buildspec: {
              version: Config.BUILDSPEC_VERSION,
              bucket: Bucket.Buildspec.bucketName,
            },
            runID: input.runID,
            stateUpdateID: input.stateUpdateID,
            workspaceID: useWorkspace(),
            stage: input.stage,
            cloneUrl: input.cloneUrl,
            credentials: config.credentials,
            trigger: input.trigger,
          } satisfies RunnerEvent),
        })
      );
    }
  );
}
