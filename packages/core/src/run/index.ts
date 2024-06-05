import { createHash } from "crypto";
import { z } from "zod";
import {
  CreateScheduleCommand,
  SchedulerClient,
} from "@aws-sdk/client-scheduler";
import {
  CreateFunctionCommand,
  DeleteFunctionCommand,
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
  DeleteRoleCommand,
  DetachRolePolicyCommand,
  DeleteRolePolicyCommand,
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
import { Function } from "sst/node/function";
import { Credentials } from "../aws";
import { DetachPolicyCommand } from "@aws-sdk/client-iot";

export module Run {
  const BUILD_TIMEOUT = 960000; // 16 minutes
  const RUNNER_INACTIVE_TIME = 604800000; // 1 week

  export type RunTimeoutMonitorEvent = {
    workspaceID: string;
    runID: string;
    stateUpdateID: string;
  };

  export type RunnerRemoverEvent = {
    workspaceID: string;
    runnerID: string;
    removeIfNotUsedAfter: number;
  };

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

  export type ConfigParserEvent = {
    content: string;
    trigger?: Trigger;
    stage?: string;
  };

  export const AppConfig = z.object({
    version: z.string().nonempty().optional(),
    name: z.string().nonempty(),
    providers: z.record(z.any()).optional(),
  });
  export type AppConfig = z.infer<typeof AppConfig>;

  export const CiConfig = z.object({
    runner: z.object({
      architecture: z.enum(["x86_64", "arm64"]),
      image: z.string().nonempty(),
    }),
    config: z.object({
      stage: z.string().nonempty(),
      env: z.record(z.string().nonempty()),
    }),
  });
  export type CiConfig = z.infer<typeof CiConfig>;

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
        ciConfig: CiConfig,
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

  export const parseSstConfig = zod(
    z.object({
      content: z.string().nonempty(),
      trigger: Trigger.optional(),
      stage: z.string().optional(),
    }),
    async (input) => {
      const lambda = new LambdaClient({ retryStrategy: RETRY_STRATEGY });
      const ret = await lambda.send(
        new InvokeCommand({
          FunctionName: Function.ConfigParser.functionName,
          InvocationType: "RequestResponse",
          Payload: JSON.stringify({
            content: input.content,
            trigger: input.trigger,
            stage: input.stage,
          } satisfies ConfigParserEvent),
        })
      );
      if (ret.FunctionError) throw new Error("Failed to parse config");

      const payload = JSON.parse(Buffer.from(ret.Payload!).toString());
      if (payload.error) throw new Error(payload.error);

      payload.ci = payload.ci ?? {};
      payload.ci.runner = payload.ci.runner ?? {};
      payload.ci.runner.architecture =
        payload.ci.runner.architecture ?? "x86_64";
      payload.ci.runner.image =
        payload.ci.runner.image ??
        `${Config.IMAGE_URI}:${payload.ci.runner.architecture}-1`;
      payload.region =
        typeof payload.app.providers?.aws === "object"
          ? payload.app.providers.aws.region ?? "us-east-1"
          : "us-east-1";

      return payload as {
        region: string;
        app: AppConfig;
        ci: CiConfig;
      };
    }
  );

  export const create = zod(
    z.object({
      appID: z.string().nonempty(),
      cloneUrl: z.string().nonempty(),
      region: z.string().nonempty(),
      trigger: Trigger,
      appConfig: AppConfig,
      ciConfig: CiConfig,
    }),
    async (input) => {
      const appID = input.appID;
      const stageName = input.ciConfig.config.stage;
      const region = input.region;

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

        await createTransactionEffect(() =>
          Promise.allSettled([
            Event.Created.publish({
              runID,
              stateUpdateID,
              stageID,
              awsAccountID,
              ...input,
            }),
            scheduler.send(
              new CreateScheduleCommand({
                Name: `run-timeout-${runID}`,
                GroupName: process.env.TIMEOUT_MONITOR_SCHEDULE_GROUP_NAME!,
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
                  RoleArn: process.env.TIMEOUT_MONITOR_SCHEDULE_ROLE_ARN,
                  Input: JSON.stringify({
                    workspaceID: useWorkspace(),
                    runID,
                    stateUpdateID,
                  } satisfies RunTimeoutMonitorEvent),
                },
                ActionAfterCompletion: "DELETE",
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

  export const getRunnerByID = zod(z.string().cuid2(), async (runnerID) => {
    return await useTransaction((tx) =>
      tx
        .select()
        .from(runRunnerTable)
        .where(
          and(
            eq(runRunnerTable.workspaceID, useWorkspace()),
            eq(runRunnerTable.id, runnerID)
          )
        )
        .execute()
        .then((x) => x[0])
    );
  });

  export const lookupRunner = zod(
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
      credentials: z.custom<Credentials>(),
    }),
    async (input) => {
      const { region, credentials, architecture, image } = input;
      const suffix =
        architecture +
        "-" +
        createHash("sha256")
          .update(`lambda${architecture}${image}`)
          .digest("hex")
          .substring(0, 8) +
        (Config.STAGE !== "production" ? "-" + Config.STAGE : "");

      const runnerID = createId();
      await scheduleRunnerRemover(runnerID);
      await createRunnerRecordWithoutResource();
      const roleArn = await createIamRoleInUserAccount();
      const functionArn = await createFunctionInUserAccount();
      await createEventTargetInUserAccount();

      const resource = {
        type: "lambda" as const,
        properties: {
          role: roleArn,
          function: functionArn,
        },
      };

      await updateRunnerRecordWithResource();

      return { id: runnerID, resource };

      function createRunnerRecordWithoutResource() {
        return useTransaction((tx) =>
          tx
            .insert(runRunnerTable)
            .values({
              id: runnerID,
              workspaceID: useWorkspace(),
              awsAccountID: input.awsAccountID,
              region,
              architecture: input.architecture,
              image: input.image,
            })
            .execute()
        );
      }

      async function createIamRoleInUserAccount() {
        const iam = new IAMClient({
          credentials,
          retryStrategy: RETRY_STRATEGY,
        });
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

      async function createFunctionInUserAccount() {
        const lambda = new LambdaClient({
          credentials,
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
            return createFunctionInUserAccount();
          else if (e.name === "ResourceConflictException") {
            /* ignore */
          } else throw e;
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

      async function createEventTargetInUserAccount() {
        const eb = new EventBridgeClient({
          credentials,
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

          const iam = new IAMClient({ credentials });
          const roleName =
            "SSTConsolePublisher" +
            (Config.STAGE !== "production" ? "-" + Config.STAGE : "");
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

      function updateRunnerRecordWithResource() {
        return useTransaction((tx) =>
          tx
            .update(runRunnerTable)
            .set({
              resource,
            })
            .where(
              and(
                eq(runRunnerTable.id, runnerID),
                eq(runRunnerTable.workspaceID, useWorkspace())
              )
            )
            .execute()
        );
      }
    }
  );

  export const removeRunner = zod(
    z.object({
      runner: z.custom<typeof runRunnerTable.$inferSelect>(),
      credentials: z.custom<Credentials>(),
    }),
    async (input) => {
      const { runner, credentials } = input;

      await removeIamRoleInUserAccount();
      await removeFunctionInUserAccount();
      await removeRunnerRecord();

      async function removeIamRoleInUserAccount() {
        const roleArn = runner.resource?.properties.role;
        if (!roleArn) return;
        const roleName = roleArn.split("/").pop()!;

        const iam = new IAMClient({
          credentials,
          retryStrategy: RETRY_STRATEGY,
        });
        try {
          await iam.send(
            new DeleteRolePolicyCommand({
              RoleName: roleName,
              PolicyName: "eventbridge",
            })
          );
        } catch (e: any) {
          console.error(e);
        }

        try {
          await iam.send(
            new DetachRolePolicyCommand({
              RoleName: roleName,
              PolicyArn:
                "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            })
          );
        } catch (e: any) {
          if (e.name !== "NoSuchEntityException") {
            console.error(e);
          }
        }

        try {
          await iam.send(
            new DeleteRoleCommand({
              RoleName: roleName,
            })
          );
        } catch (e: any) {
          console.error(e);
        }
      }

      async function removeFunctionInUserAccount() {
        const functionName = runner.resource?.properties.function;
        if (!functionName) return;

        const lambda = new LambdaClient({
          credentials,
          region: runner.region,
          retryStrategy: RETRY_STRATEGY,
        });
        try {
          const ret = await lambda.send(
            new DeleteFunctionCommand({
              FunctionName: functionName,
            })
          );
        } catch (e: any) {
          console.error(e);
        }
      }

      function removeRunnerRecord() {
        return useTransaction((tx) =>
          tx
            .delete(runRunnerTable)
            .where(
              and(
                eq(runRunnerTable.id, runner.id),
                eq(runRunnerTable.workspaceID, useWorkspace())
              )
            )
            .execute()
        );
      }
    }
  );

  export const invokeRunner = zod(
    z.object({
      region: z.string().nonempty(),
      resource: Resource,
      runID: z.string().cuid2(),
      runnerID: z.string().cuid2(),
      stateUpdateID: z.string().cuid2(),
      credentials: z.custom<Credentials>(),
      stage: z.string().nonempty(),
      cloneUrl: z.string().nonempty(),
      trigger: Trigger,
    }),
    async (input) => {
      const region = input.region;
      const credentials = input.credentials;

      const lambda = new LambdaClient({
        credentials,
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
            credentials,
            trigger: input.trigger,
          } satisfies RunnerEvent),
        })
      );

      // Update run's last run time
      await useTransaction((tx) =>
        tx
          .update(runRunnerTable)
          .set({
            timeRun: new Date(),
          })
          .where(
            and(
              eq(runRunnerTable.id, input.runnerID),
              eq(runRunnerTable.workspaceID, useWorkspace())
            )
          )
          .execute()
      );
    }
  );

  export const scheduleRunnerRemover = zod(
    z.string().cuid2(),
    async (runnerID) => {
      const scheduler = new SchedulerClient({
        retryStrategy: RETRY_STRATEGY,
      });

      // Check 1 day after the "RUNNER_INACTIVE_TIME" period. Remove the runner if
      // it has not been used during the "RUNNER_INACTIVE_TIME" period.
      const now = Date.now();
      return scheduler.send(
        new CreateScheduleCommand({
          Name: `runner-remover-${runnerID}-${now}`,
          GroupName: process.env.RUNNER_REMOVER_SCHEDULE_GROUP_NAME!,
          FlexibleTimeWindow: {
            Mode: "OFF",
          },
          ScheduleExpression: `at(${
            new Date(now + RUNNER_INACTIVE_TIME + 86400000)
              .toISOString()
              .split(".")[0]
          })`,
          Target: {
            Arn: process.env.RUNNER_REMOVER_FUNCTION_ARN,
            RoleArn: process.env.RUNNER_REMOVER_SCHEDULE_ROLE_ARN,
            Input: JSON.stringify({
              workspaceID: useWorkspace(),
              runnerID,
              removeIfNotUsedAfter: now + 86400000,
            } satisfies RunnerRemoverEvent),
          },
          ActionAfterCompletion: "DELETE",
        })
      );
    }
  );
}
