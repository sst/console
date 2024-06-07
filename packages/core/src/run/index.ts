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
import { and, eq, gt, inArray, isNull } from "../drizzle";
import { event } from "../event";
import {
  Log,
  Resource,
  Trigger,
  runnerTable,
  runTable,
  runnerUsageTable,
  CiConfig,
} from "./run.sql";
import { App, Stage } from "../app";
import { RunEnv } from "./env";
import { RETRY_STRATEGY } from "../util/aws";
import { State } from "../state";
import { Function } from "sst/node/function";
import { Credentials } from "../aws";
import { AppRepo } from "../app/repo";
import { Github } from "../git/github";
import { stage } from "../app/app.sql";

export module Run {
  const BUILD_TIMEOUT = 960000; // 16 minutes
  const RUNNER_INACTIVE_TIME = 604800000; // 1 week
  const RUNNER_WARMING_INTERVAL = 300000; // 5 minutes
  const RUNNER_WARMING_INACTIVE_TIME = 86400000; // 1 day

  export type RunTimeoutMonitorEvent = {
    workspaceID: string;
    runID: string;
  };

  export type RunnerRemoverEvent = {
    workspaceID: string;
    runnerID: string;
    removeIfNotUsedAfter: number;
  };

  export type RunnerWarmerEvent = {
    workspaceID: string;
    runnerID: string;
  };

  export type RunnerEvent =
    | {
        warm: true;
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
      }
    | {
        warm: false;
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

  export const SstConfig = z.object({
    region: z.string().nonempty(),
    ci: CiConfig,
    app: z.object({
      version: z.string().nonempty().optional(),
      name: z.string().nonempty(),
      providers: z.record(z.any()).optional(),
    }),
  });
  export type SstConfig = z.infer<typeof SstConfig>;

  export const Event = {
    Created: event(
      "run.created",
      z.object({
        appID: z.string().nonempty(),
        stageID: z.string().nonempty(),
        runID: z.string().nonempty(),
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
        timestamp: z.number().int(),
      })
    ),
    Completed: event(
      "run.completed",
      z.object({
        workspaceID: z.string().nonempty(),
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

      return payload as SstConfig;
    }
  );

  export const fromID = zod(z.string().cuid2(), (runID) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(runTable)
        .where(
          and(eq(runTable.workspaceID, useWorkspace()), eq(runTable.id, runID))
        )
        .execute()
        .then((x) => x[0])
    )
  );

  export const getIncompletedRuns = zod(z.string().cuid2(), async (stageID) => {
    return await useTransaction((tx) =>
      tx
        .select()
        .from(runTable)
        .where(
          and(
            eq(runTable.workspaceID, useWorkspace()),
            eq(runTable.stageID, stageID),
            isNull(runTable.timeCompleted)
          )
        )
        .orderBy(runTable.timeCreated)
        .execute()
    );
  });

  export const create = zod(
    z.object({
      appID: z.string().cuid2(),
      trigger: Trigger,
      sstConfig: SstConfig,
    }),
    async (input) => {
      const appID = input.appID;
      const stageName = input.sstConfig.ci.target.stage;
      const region = input.sstConfig.region;

      // Get AWS Account ID from Run Env
      const envs = await RunEnv.listByStage({ appID, stageName });
      const awsAccountID = envs["__AWS_ACCOUNT_ID"];
      if (!awsAccountID)
        throw new Error("AWS Account ID is not set in Run Env");

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
      const stateUpdateID = createId();
      await createTransaction(async (tx) => {
        await tx
          .insert(runTable)
          .values({
            id: runID,
            workspaceID: useWorkspace(),
            stageID,
            stateUpdateID,
            trigger: input.trigger,
            config: input.sstConfig.ci,
          })
          .execute();

        // Create State Update
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

        await createTransactionEffect(() =>
          Event.Created.publish({ appID: input.appID, stageID, runID })
        );
      });
    }
  );

  export const start = zod(
    z.object({
      appID: z.string().cuid2(),
      runID: z.string().cuid2(),
      stageID: z.string().cuid2(),
    }),
    async ({ appID, runID, stageID }) => {
      let run;
      let runner;
      let context = "initialize runner";
      try {
        run = await fromID(runID);
        if (!run) throw new Error("Run not found");

        const stage = await Stage.fromID(run.stageID);
        if (!stage) throw new Error("Stage not found");

        const appRepo = await AppRepo.getByAppID(appID);
        if (!appRepo) throw new Error("AppRepo not found");

        const awsConfig = await Stage.assumeRole(stageID);
        if (!awsConfig) return;

        // Get runner (create if not exist)
        context = "lookup existing runner";
        while (true) {
          runner = await lookupRunner({
            awsAccountID: stage.awsAccountID,
            appRepoID: appRepo.id,
            region: stage.region,
            runnerConfig: run.config.runner,
          });
          if (!runner || runner.resource) break;
          await new Promise((resolve) => setTimeout(resolve, 5000));
          console.log("waiting for runner being created");
        }
        context = "create runner";
        if (!runner) {
          runner = await createRunner({
            appRepoID: appRepo.id,
            awsAccountID: stage.awsAccountID,
            region: stage.region,
            runnerConfig: run.config.runner,
            credentials: awsConfig.credentials,
          });
        }
        if (!runner.resource) {
          throw new Error("Failed to create runner");
        }

        // Build cloneUrl
        context = "start runner";
        const gitRepo = await Github.getByRepoID(appRepo.repoID);
        if (!gitRepo) throw new Error("Github Repo not found");
        const cloneUrl = await Github.getCloneUrl(gitRepo);

        // Run runner
        await invokeRunner({
          run,
          runner,
          cloneUrl,
          credentials: awsConfig.credentials,
        });
      } catch (e) {
        await complete({ runID, error: `Failed to ${context}` });
        throw e;
      }

      // Schedule timeout monitor
      await scheduleRunTimeoutMonitor(run);

      // Schedule warmer if not scheduled
      if (!runner.warmer) await scheduleRunnerWarmer(runner.id);
    }
  );

  export const complete = zod(
    z.object({
      runID: z.string().cuid2(),
      error: z.string().nonempty().optional(),
    }),
    async ({ runID, error }) => {
      const run = await fromID(runID);
      if (!run) return;

      // Mark current run completed
      await markRunCompleted({
        runID,
        stateUpdateID: run.stateUpdateID,
        error,
      });

      // Get queued runs
      const runs = await getIncompletedRuns(run.stageID);
      if (!runs.length) return;

      // Skip all runs except the first one
      const runsToSkip = runs.slice(1);
      if (runsToSkip.length) {
        await markRunsSkipped({
          runIDs: runsToSkip.map((r) => r.id),
          stateUpdateIDs: runsToSkip.map((r) => r.stateUpdateID),
        });
      }

      // Start the most recent run
      const nextRun = runs[0]!;
      const stage = await Stage.fromID(nextRun.stageID);
      if (!stage) return;
      await start({
        appID: stage.appID,
        stageID: nextRun.stageID,
        runID: nextRun.id,
      });
    }
  );

  export const scheduleRunTimeoutMonitor = zod(
    z.custom<typeof runTable.$inferSelect>(),
    async (run) => {
      const scheduler = new SchedulerClient({
        retryStrategy: RETRY_STRATEGY,
      });

      await scheduler.send(
        new CreateScheduleCommand({
          Name: `run-timeout-${run.id}`,
          GroupName: process.env.RUN_TIMEOUT_MONITOR_SCHEDULE_GROUP_NAME!,
          FlexibleTimeWindow: {
            Mode: "OFF",
          },
          ScheduleExpression: `at(${
            new Date(Date.now() + BUILD_TIMEOUT).toISOString().split(".")[0]
          })`,
          Target: {
            Arn: process.env.RUN_TIMEOUT_MONITOR_FUNCTION_ARN,
            RoleArn: process.env.RUN_TIMEOUT_MONITOR_SCHEDULE_ROLE_ARN,
            Input: JSON.stringify({
              workspaceID: useWorkspace(),
              runID: run.id,
            } satisfies RunTimeoutMonitorEvent),
          },
          ActionAfterCompletion: "DELETE",
        })
      );
    }
  );

  export const markRunStarted = zod(
    z.object({
      runID: z.string().nonempty(),
      awsRequestId: z.string().nonempty(),
      logGroup: z.string().nonempty(),
      logStream: z.string().nonempty(),
      timestamp: z.number().int(),
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
              timestamp: input.timestamp,
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

  export const markRunsSkipped = zod(
    z.object({
      runIDs: z.array(z.string().cuid2()),
      stateUpdateIDs: z.array(z.string().cuid2()),
    }),
    async ({ runIDs, stateUpdateIDs }) =>
      await createTransaction(async (tx) => {
        const timeCompleted = new Date();
        await tx
          .update(runTable)
          .set({
            timeCompleted,
          })
          .where(
            and(
              eq(runTable.workspaceID, useWorkspace()),
              inArray(runTable.id, runIDs),
              isNull(runTable.timeCompleted)
            )
          )
          .execute();

        await State.completeUpdate({
          updateIDs: stateUpdateIDs,
          time: timeCompleted,
        });
      })
  );

  export const markRunCompleted = zod(
    z.object({
      runID: z.string().cuid2(),
      stateUpdateID: z.string().cuid2(),
      error: z.string().nonempty().optional(),
    }),
    async (input) =>
      await createTransaction(async (tx) => {
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
          updateIDs: [input.stateUpdateID],
          time: timeCompleted,
        });
      })
  );

  export const getRunnerByID = zod(z.string().cuid2(), async (runnerID) => {
    return await useTransaction((tx) =>
      tx
        .select()
        .from(runnerTable)
        .where(
          and(
            eq(runnerTable.workspaceID, useWorkspace()),
            eq(runnerTable.id, runnerID)
          )
        )
        .execute()
        .then((x) => x[0])
    );
  });

  export const getRunnerActiveUsage = zod(
    z.string().cuid2(),
    async (runnerID) => {
      return await useTransaction((tx) =>
        tx
          .select()
          .from(runnerUsageTable)
          .where(
            and(
              eq(runnerUsageTable.workspaceID, useWorkspace()),
              eq(runnerUsageTable.id, runnerID),
              gt(
                runnerUsageTable.timeRun,
                new Date(Date.now() - RUNNER_WARMING_INACTIVE_TIME)
              )
            )
          )
          .execute()
      );
    }
  );

  export const setRunnerWarmer = zod(
    z.object({
      runnerID: z.string().cuid2(),
      warmer: z.string().nonempty(),
    }),
    async (input) => {
      return await useTransaction((tx) =>
        tx
          .update(runnerTable)
          .set({
            warmer: input.warmer,
          })
          .where(
            and(
              eq(runnerTable.workspaceID, useWorkspace()),
              eq(runnerTable.id, input.runnerID)
            )
          )
          .execute()
      );
    }
  );

  export const unsetRunnerWarmer = zod(z.string().cuid2(), async (runnerID) => {
    return await useTransaction((tx) =>
      tx
        .update(runnerTable)
        .set({
          warmer: null,
        })
        .where(
          and(
            eq(runnerTable.workspaceID, useWorkspace()),
            eq(runnerTable.id, runnerID)
          )
        )
        .execute()
    );
  });

  export const lookupRunner = zod(
    z.object({
      region: z.string().nonempty(),
      awsAccountID: z.string().cuid2(),
      appRepoID: z.string().cuid2(),
      runnerConfig: CiConfig.shape.runner,
    }),
    async (input) => {
      return await useTransaction((tx) =>
        tx
          .select()
          .from(runnerTable)
          .where(
            and(
              eq(runnerTable.workspaceID, useWorkspace()),
              eq(runnerTable.awsAccountID, input.awsAccountID),
              eq(runnerTable.appRepoID, input.appRepoID),
              eq(runnerTable.region, input.region),
              eq(runnerTable.architecture, input.runnerConfig.architecture),
              eq(runnerTable.image, input.runnerConfig.image)
            )
          )
          .execute()
          .then((x) => x[0])
      );
    }
  );

  export const createRunner = zod(
    z.object({
      appRepoID: z.string().cuid2(),
      awsAccountID: z.string().cuid2(),
      region: z.string().nonempty(),
      runnerConfig: CiConfig.shape.runner,
      credentials: z.custom<Credentials>(),
    }),
    async (input) => {
      const region = input.region;
      const credentials = input.credentials;
      const architecture = input.runnerConfig.architecture;
      const image = input.runnerConfig.image;
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

      return { id: runnerID, region, resource, warmer: null };

      function createRunnerRecordWithoutResource() {
        return useTransaction((tx) =>
          tx
            .insert(runnerTable)
            .values({
              id: runnerID,
              workspaceID: useWorkspace(),
              awsAccountID: input.awsAccountID,
              appRepoID: input.appRepoID,
              region,
              architecture,
              image,
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
              Code: { ImageUri: image },
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
            .update(runnerTable)
            .set({
              resource,
            })
            .where(
              and(
                eq(runnerTable.id, runnerID),
                eq(runnerTable.workspaceID, useWorkspace())
              )
            )
            .execute()
        );
      }
    }
  );

  export const removeRunner = zod(
    z.object({
      runner: z.custom<typeof runnerTable.$inferSelect>(),
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
            .delete(runnerTable)
            .where(
              and(
                eq(runnerTable.id, runner.id),
                eq(runnerTable.workspaceID, useWorkspace())
              )
            )
            .execute()
        );
      }
    }
  );

  export const invokeRunner = zod(
    z.object({
      run: z.custom<typeof runTable.$inferSelect>(),
      runner: z.object({
        id: z.string().cuid2(),
        region: z.string().nonempty(),
        resource: z.custom<(typeof runnerTable.$inferSelect)["resource"]>(),
      }),
      cloneUrl: z.string().nonempty(),
      credentials: z.custom<Credentials>(),
    }),
    async (input) => {
      const lambda = new LambdaClient({
        credentials: input.credentials,
        region: input.runner.region,
        retryStrategy: RETRY_STRATEGY,
      });
      await lambda.send(
        new InvokeCommand({
          FunctionName: input.runner.resource!.properties.function,
          InvocationType: "Event",
          Payload: JSON.stringify({
            warm: false,
            buildspec: {
              version: Config.BUILDSPEC_VERSION,
              bucket: Bucket.Buildspec.bucketName,
            },
            runID: input.run.id,
            stateUpdateID: input.run.stateUpdateID,
            workspaceID: useWorkspace(),
            stage: input.run.config.target.stage,
            cloneUrl: input.cloneUrl,
            credentials: input.credentials,
            trigger: input.run.trigger,
          } satisfies RunnerEvent),
        })
      );

      // Update runner's last run time
      const now = new Date();
      await useTransaction(async (tx) => {
        await tx
          .update(runnerTable)
          .set({ timeRun: now })
          .where(
            and(
              eq(runnerTable.id, input.runner.id),
              eq(runnerTable.workspaceID, useWorkspace())
            )
          )
          .execute();

        await tx
          .insert(runnerUsageTable)
          .values({
            workspaceID: useWorkspace(),
            id: createId(),
            runnerID: input.runner.id,
            stageID: input.run.stageID,
            timeRun: now,
          })
          .onDuplicateKeyUpdate({
            set: {
              timeRun: now,
            },
          })
          .execute();
      });
    }
  );

  export const warmRunner = zod(
    z.object({
      region: z.string().nonempty(),
      resource: Resource,
      credentials: z.custom<Credentials>(),
      cloneUrl: z.string().nonempty(),
      instances: z.number().int(),
    }),
    async (input) => {
      const { region, resource, credentials, cloneUrl, instances } = input;

      const lambda = new LambdaClient({
        credentials,
        region,
        retryStrategy: RETRY_STRATEGY,
      });
      await Promise.all(
        Array(instances)
          .fill(0)
          .map((_) =>
            lambda.send(
              new InvokeCommand({
                FunctionName: resource.properties.function,
                InvocationType: "Event",
                Payload: JSON.stringify({
                  warm: true,
                  buildspec: {
                    version: Config.BUILDSPEC_VERSION,
                    bucket: Bucket.Buildspec.bucketName,
                  },
                  cloneUrl,
                  credentials,
                } satisfies RunnerEvent),
              })
            )
          )
      );
    }
  );

  export const scheduleRunnerWarmer = zod(
    z.string().cuid2(),
    async (runnerID) => {
      const now = Date.now();
      const scheduler = new SchedulerClient({
        retryStrategy: RETRY_STRATEGY,
      });
      const name = `runner-warmer-${runnerID}-${now}`;
      await scheduler.send(
        new CreateScheduleCommand({
          Name: name,
          GroupName: process.env.RUNNER_WARMER_SCHEDULE_GROUP_NAME!,
          FlexibleTimeWindow: {
            Mode: "OFF",
          },
          ScheduleExpression: `at(${
            new Date(now + RUNNER_WARMING_INTERVAL).toISOString().split(".")[0]
          })`,
          Target: {
            Arn: process.env.RUNNER_WARMER_FUNCTION_ARN,
            RoleArn: process.env.RUNNER_WARMER_SCHEDULE_ROLE_ARN,
            Input: JSON.stringify({
              workspaceID: useWorkspace(),
              runnerID,
            } satisfies Run.RunnerWarmerEvent),
          },
          ActionAfterCompletion: "DELETE",
        })
      );

      await setRunnerWarmer({ runnerID, warmer: name });
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
