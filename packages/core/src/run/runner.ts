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
import { z } from "zod";
import { zod } from "../util/zod";
import { useTransaction } from "../util/transaction";
import { useWorkspace } from "../actor";
import { createId } from "@paralleldrive/cuid2";
import { and, db, eq, notInArray, or, sql } from "../drizzle";
import { Config } from "sst/node/config";
import { Resource, RunnerNames, Trigger, runRunner } from "./run.sql";
import { StageCredentials } from "../app/stage";
import { Bucket } from "sst/node/bucket";
import { RETRY_STRATEGY } from "../util/aws";

export * as Runner from "./runner";

export type RunnerPayload = {
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

export const RunnerInfo = z.object({
  id: z.string().cuid2(),
  awsAccountID: z.string().cuid2(),
  region: z.string().nonempty(),
  name: z.enum(RunnerNames),
  time: z.object({
    created: z.string(),
    deleted: z.string().optional(),
    updated: z.string(),
  }),
  resource: Resource,
});
export type RunnerInfo = z.infer<typeof RunnerInfo>;

export function serializeUpdate(
  input: typeof runRunner.$inferSelect
): RunnerInfo {
  return {
    id: input.id,
    time: {
      created: input.timeCreated.toISOString(),
      updated: input.timeUpdated.toISOString(),
      deleted: input.timeDeleted?.toISOString(),
    },
    awsAccountID: input.awsAccountID,
    region: input.region,
    name: input.name,
    resource: input.resource,
  };
}

export const get = zod(
  RunnerInfo.pick({ awsAccountID: true, region: true, name: true }),
  async (input) => {
    return await useTransaction((tx) =>
      tx
        .select()
        .from(runRunner)
        .where(
          and(
            eq(runRunner.workspaceID, useWorkspace()),
            eq(runRunner.awsAccountID, input.awsAccountID),
            eq(runRunner.region, input.region),
            eq(runRunner.name, input.name)
          )
        )
        .execute()
        .then((x) => x[0])
    );
  }
);

export const invoke = zod(
  RunnerInfo.pick({
    region: true,
    resource: true,
  }).extend({
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
        } satisfies RunnerPayload),
      })
    );
  }
);

export const create = zod(
  RunnerInfo.pick({
    awsAccountID: true,
    region: true,
    name: true,
  }).extend({
    config: z.custom<StageCredentials>(),
  }),
  async (input) => {
    const region = input.region;
    const config = input.config;
    const suffix = Config.STAGE !== "production" ? "-" + Config.STAGE : "";
    const imageTag = input.name.split("/")[1];

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
        .insert(runRunner)
        .values({
          id: createId(),
          workspaceID: useWorkspace(),
          awsAccountID: input.awsAccountID,
          region,
          name: input.name,
          resource,
        })
        .execute()
    );

    return resource;

    async function createIamRole() {
      const iam = new IAMClient({ ...config, retryStrategy: RETRY_STRATEGY });
      const roleName = `sst-runner-${imageTag}-${region}${suffix}`;
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
      const functionName = `sst-runner-${imageTag}${suffix}`;
      try {
        const ret = await lambda.send(
          new CreateFunctionCommand({
            FunctionName: functionName,
            Role: roleArn,
            Code: {
              ImageUri: `${Config.IMAGE_URI}:${imageTag}-1`,
            },
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
