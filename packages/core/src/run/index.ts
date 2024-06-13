import { createHash } from "crypto";
import { z } from "zod";
import {
  CreateScheduleCommand,
  SchedulerClient,
} from "@aws-sdk/client-scheduler";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
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
  Engine,
} from "./run.sql";
import { App, Stage } from "../app";
import { RunConfig } from "./config";
import { RETRY_STRATEGY } from "../util/aws";
import { State } from "../state";
import { Function } from "sst/node/function";
import { AWS, Credentials } from "../aws";
import { AppRepo } from "../app/repo";
import { Github } from "../git/github";
import { LambdaRunner } from "./lambda-runner";
import { CodebuildRunner } from "./codebuild-runner";

export module Run {
  const DEFAULT_ENGINE = "codebuild";
  const DEFAULT_ARCHITECTURE = "x86_64";
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
        engine: string;
        runID: string;
        workspaceID: string;
        stateUpdateID: string;
        stage: string;
        env: Record<string, string>;
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
    ci: CiConfig,
    app: z.object({
      version: z.string().nonempty().optional(),
      name: z.string().nonempty(),
      providers: z.record(z.any()).optional(),
    }),
  });
  export type SstConfig = z.infer<typeof SstConfig>;
  export type SstConfigParseError = {
    error:
      | "parse_config"
      | "evaluate_config"
      | "v2_app"
      | "missing_ci"
      | "missing_ci_target"
      | "missing_ci_stage";
  };

  export const Event = {
    Created: event(
      "run.created",
      z.object({
        stageID: z.string().nonempty(),
      })
    ),
    Completed: event(
      "run.completed",
      z.object({
        stageID: z.string().nonempty(),
      })
    ),
    RunnerStarted: event(
      "runner.started",
      z.object({
        workspaceID: z.string().nonempty(),
        engine: z.enum(Engine),
        runID: z.string().nonempty(),
        logGroup: z.string().nonempty(),
        logStream: z.string().nonempty(),
        awsRequestId: z.string().nonempty().optional(),
        timestamp: z.number().int(),
      })
    ),
    RunnerCompleted: event(
      "runner.completed",
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
      return payload.error
        ? (payload as SstConfigParseError)
        : (payload as SstConfig);
    }
  );

  export const create = zod(
    z.object({
      appID: z.string().cuid2(),
      trigger: Trigger,
      sstConfig: SstConfig,
    }),
    async (input) => {
      const appID = input.appID;
      const stageName = input.sstConfig.ci.target.stage;
      const region = input.sstConfig.app.providers?.aws?.region ?? "us-east-1";

      // Validate app name
      const app = await App.fromID(appID);
      if (app?.name !== input.sstConfig.app.name)
        throw new Error("App name does not match sst.config.ts");

      // Get AWS Account ID from Run Env
      const env = await RunConfig.getByStageName({ appID, stageName });
      const awsAccountExternalID = env?.awsAccountExternalID;
      if (!awsAccountExternalID)
        throw new Error("AWS Account ID is not set in Run Env");
      const awsAccount = await AWS.Account.fromExternalID(awsAccountExternalID);
      if (!awsAccount)
        throw new Error("AWS Account is not linked to the workspace");

      // Create stage if stage not exist
      let stageID = await App.Stage.fromName({
        appID,
        name: stageName,
        region,
        awsAccountID: awsAccount.id,
      }).then((s) => s?.id!);

      if (!stageID) {
        console.log("creating stage", { appID, stageID });
        stageID = await App.Stage.connect({
          name: stageName,
          appID,
          region,
          awsAccountID: awsAccount.id,
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

        await createTransactionEffect(() => Event.Created.publish({ stageID }));
      });
    }
  );

  export const orchestrate = zod(z.string().cuid2(), async (stageID) => {
    // Get queued runs
    const runs = await useTransaction((tx) =>
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
    if (!runs.length) return;
    if (runs.some((r) => r.active)) return;

    const run = runs[0]!;
    const runsToSkip = runs.slice(1);

    // Mark the run as active
    try {
      await useTransaction((tx) =>
        tx
          .update(runTable)
          .set({ active: true })
          .where(
            and(
              eq(runTable.workspaceID, useWorkspace()),
              eq(runTable.id, run.id)
            )
          )
      );
    } catch (e: any) {
      // A run is already active
      if (e.message.includes("errno 1062")) return;
      throw e;
    }

    // Skip all runs except the first one
    if (runsToSkip.length) {
      await createTransaction(async (tx) => {
        const timeCompleted = new Date();
        await tx
          .update(runTable)
          .set({ timeCompleted })
          .where(
            and(
              eq(runTable.workspaceID, useWorkspace()),
              inArray(
                runTable.id,
                runsToSkip.map((r) => r.id)
              ),
              isNull(runTable.timeCompleted)
            )
          )
          .execute();

        await State.completeUpdate({
          updateIDs: runsToSkip.map((r) => r.stateUpdateID),
          time: timeCompleted,
        });
      });
    }

    // Start the most recent run
    let runner;
    let context = "initialize runner";
    try {
      const stage = await Stage.fromID(run.stageID);
      if (!stage) throw new Error("Stage not found");

      const appRepo = await AppRepo.getByAppID(stage.appID);
      if (!appRepo) throw new Error("AppRepo not found");

      const awsConfig = await Stage.assumeRole(stageID);
      if (!awsConfig) return;

      // Get runner (create if not exist)
      context = "lookup existing runner";
      const waitTill = Date.now() + 120000; // wait up to 2 minutes
      while (Date.now() < waitTill) {
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
          awsAccountExternalID: awsConfig.awsAccountID,
          region: stage.region,
          runnerConfig: run.config.runner,
          credentials: awsConfig.credentials,
        });
      }
      if (!runner.resource) {
        throw new Error("Failed to create runner");
      }

      // Get run env
      const env = await RunConfig.getByStageName({
        appID: stage.appID,
        stageName: run.config.target.stage,
      });
      if (!env) throw new Error("AWS Account ID is not set in Run Env");

      // Build cloneUrl
      context = "start runner";
      const gitRepo = await Github.getExternalInfoByRepoID(appRepo.repoID);
      if (!gitRepo) throw new Error("Github Repo not found");
      const cloneUrl = await Github.getCloneUrl(gitRepo);

      // Run runner
      const Runner = useRunner(runner.engine);
      await Runner.invoke({
        credentials: awsConfig.credentials,
        region: runner.region,
        resource: runner.resource,
        payload: {
          warm: false,
          engine: runner.engine,
          buildspec: {
            version: Config.BUILDSPEC_VERSION,
            bucket: Bucket.Buildspec.bucketName,
          },
          runID: run.id,
          stateUpdateID: run.stateUpdateID,
          workspaceID: useWorkspace(),
          stage: run.config.target.stage,
          env: {
            ...run.config.target.env,
            ...env.env,
          },
          cloneUrl,
          credentials: awsConfig.credentials,
          trigger: run.trigger,
        },
      });

      // Update runner's last run time
      const now = new Date();
      const runnerID = runner.id;
      await useTransaction(async (tx) => {
        await tx
          .update(runnerTable)
          .set({ timeRun: now })
          .where(
            and(
              eq(runnerTable.id, runnerID),
              eq(runnerTable.workspaceID, useWorkspace())
            )
          )
          .execute();

        await tx
          .insert(runnerUsageTable)
          .values({
            workspaceID: useWorkspace(),
            id: createId(),
            runnerID,
            stageID: run.stageID,
            timeRun: now,
          })
          .onDuplicateKeyUpdate({ set: { timeRun: now } })
          .execute();
      });
    } catch (e) {
      await complete({ runID: run.id, error: `Failed to ${context}` });
      throw e;
    }

    // Schedule timeout monitor
    const Runner = useRunner(runner.engine);
    const scheduler = new SchedulerClient({ retryStrategy: RETRY_STRATEGY });
    await scheduler.send(
      new CreateScheduleCommand({
        Name: `run-timeout-${run.id}`,
        GroupName: process.env.RUN_TIMEOUT_MONITOR_SCHEDULE_GROUP_NAME!,
        FlexibleTimeWindow: {
          Mode: "OFF",
        },
        ScheduleExpression: `at(${
          new Date(Date.now() + Runner.BUILD_TIMEOUT)
            .toISOString()
            .split(".")[0]
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

    // Schedule warmer if not scheduled
    if (!runner.warmer) await scheduleRunnerWarmer(runner.id);
  });

  export const complete = zod(
    z.object({
      runID: z.string().cuid2(),
      error: z.string().nonempty().optional(),
    }),
    async ({ runID, error }) => {
      const run = await useTransaction((tx) =>
        tx
          .select()
          .from(runTable)
          .where(
            and(
              eq(runTable.workspaceID, useWorkspace()),
              eq(runTable.id, runID)
            )
          )
          .execute()
          .then((x) => x[0])
      );
      if (!run) return;

      await createTransaction(async (tx) => {
        const timeCompleted = new Date();
        await tx
          .update(runTable)
          .set({
            timeCompleted,
            error,
            active: null,
          })
          .where(
            and(
              eq(runTable.id, runID),
              eq(runTable.workspaceID, useWorkspace()),
              isNull(runTable.timeCompleted)
            )
          )
          .execute();
        await State.completeUpdate({
          updateIDs: [run.stateUpdateID],
          time: timeCompleted,
        });

        await createTransactionEffect(() =>
          Event.Completed.publish({ stageID: run.stageID })
        );
      });
    }
  );

  export const markRunStarted = zod(
    z.object({
      engine: z.enum(Engine),
      runID: z.string().nonempty(),
      awsRequestId: z.string().nonempty().optional(),
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
            log:
              input.engine === "lambda"
                ? {
                    engine: "lambda",
                    requestID: input.awsRequestId!,
                    logGroup: input.logGroup,
                    logStream: input.logStream,
                    timestamp: input.timestamp,
                  }
                : {
                    engine: "codebuild",
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

  const useRunner = zod(
    z.enum(Engine),
    (engine) =>
      ({
        lambda: LambdaRunner,
        codebuild: CodebuildRunner,
      }[engine])
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
      const engine = input.runnerConfig?.engine ?? DEFAULT_ENGINE;
      const Runner = useRunner(engine);
      const architecture =
        input.runnerConfig?.architecture ?? DEFAULT_ARCHITECTURE;
      const image = input.runnerConfig?.image ?? Runner.getImage(architecture);
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
              eq(runnerTable.engine, engine),
              eq(runnerTable.architecture, architecture),
              eq(runnerTable.image, image)
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
      awsAccountExternalID: z.string().nonempty(),
      region: z.string().nonempty(),
      runnerConfig: CiConfig.shape.runner,
      credentials: z.custom<Credentials>(),
    }),
    async (input) => {
      const awsAccountExternalID = input.awsAccountExternalID;
      const region = input.region;
      const credentials = input.credentials;
      const engine = input.runnerConfig?.engine ?? DEFAULT_ENGINE;
      const Runner = useRunner(engine);
      const architecture =
        input.runnerConfig?.architecture ?? DEFAULT_ARCHITECTURE;
      const image = input.runnerConfig?.image ?? Runner.getImage(architecture);
      const runnerSuffix =
        architecture +
        "-" +
        createHash("sha256")
          .update(`${engine}${architecture}${image}`)
          .digest("hex")
          .substring(0, 8) +
        (Config.STAGE !== "production" ? "-" + Config.STAGE : "");

      const runnerID = createId();
      let resource;
      try {
        // Create runner row without resource
        await useTransaction((tx) =>
          tx
            .insert(runnerTable)
            .values({
              id: runnerID,
              workspaceID: useWorkspace(),
              awsAccountID: input.awsAccountID,
              appRepoID: input.appRepoID,
              region,
              engine,
              architecture,
              image,
            })
            .execute()
        );

        // Create resources
        resource = await Runner.createResource({
          credentials,
          awsAccountExternalID,
          region,
          suffix: runnerSuffix,
          image,
          architecture,
        });

        // Create event target in user account to forward external events
        const eb = new EventBridgeClient({
          credentials,
          region,
          retryStrategy: RETRY_STRATEGY,
        });
        const suffix = Config.STAGE !== "production" ? "-" + Config.STAGE : "";
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

        // Store resource
        await useTransaction((tx) =>
          tx
            .update(runnerTable)
            .set({ resource: resource! })
            .where(
              and(
                eq(runnerTable.id, runnerID),
                eq(runnerTable.workspaceID, useWorkspace())
              )
            )
            .execute()
        );
      } catch (e) {
        // Remove from db
        await useTransaction((tx) =>
          tx
            .delete(runnerTable)
            .where(
              and(
                eq(runnerTable.id, runnerID),
                eq(runnerTable.workspaceID, useWorkspace())
              )
            )
            .execute()
        );
        throw e;
      }

      await scheduleRunnerRemover(runnerID);

      return { id: runnerID, region, engine, resource, warmer: null };
    }
  );

  export const removeRunner = zod(
    z.object({
      runner: z.custom<typeof runnerTable.$inferSelect>(),
      credentials: z.custom<Credentials>(),
    }),
    async (input) => {
      const { runner, credentials } = input;
      const Runner = useRunner(runner.engine);

      // Remove resources
      if (runner.resource) {
        await Runner.removeResource({
          credentials,
          region: runner.region,
          resource: runner.resource,
        });
      }

      // Remove db entry
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
  );

  export const warmRunner = zod(
    z.object({
      region: z.string().nonempty(),
      engine: z.enum(Engine),
      resource: Resource,
      credentials: z.custom<Credentials>(),
      cloneUrl: z.string().nonempty(),
      instances: z.number().int(),
    }),
    async ({ region, engine, resource, credentials, cloneUrl, instances }) => {
      const Runner = useRunner(engine);
      await Promise.all(
        Array(instances)
          .fill(0)
          .map((_) =>
            Runner.invoke({
              region,
              resource,
              credentials,
              payload: {
                warm: true,
                buildspec: {
                  version: Config.BUILDSPEC_VERSION,
                  bucket: Bucket.Buildspec.bucketName,
                },
                cloneUrl,
                credentials,
              },
            })
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
