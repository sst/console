import { z } from "zod";
import {
  CreateProjectCommand,
  DeleteProjectCommand,
  StartBuildCommand,
  CodeBuildClient,
} from "@aws-sdk/client-codebuild";
import {
  PutRolePolicyCommand,
  CreateRoleCommand,
  GetRoleCommand,
  IAMClient,
  DeleteRoleCommand,
  DeleteRolePolicyCommand,
} from "@aws-sdk/client-iam";
import { zod } from "../util/zod";
import { Resource, Architecture } from "./run.sql";
import { RETRY_STRATEGY } from "../util/aws";
import { Credentials } from "../aws";
import { Run } from ".";

export module CodebuildRunner {
  export const BUILD_TIMEOUT = 5400000; // 1.5 hours

  export const getImage = zod(z.enum(Architecture), (architecture) =>
    architecture === "x86_64"
      ? `aws/codebuild/amazonlinux2-x86_64-standard:5.0`
      : `aws/codebuild/amazonlinux2-aarch64-standard:3.0`
  );

  export const createResource = zod(
    z.object({
      credentials: z.custom<Credentials>(),
      awsAccountExternalID: z.string().nonempty(),
      region: z.string().nonempty(),
      suffix: z.string().nonempty(),
      image: z.string().nonempty(),
      architecture: z.enum(Architecture),
    }),
    async ({
      credentials,
      awsAccountExternalID,
      region,
      suffix,
      image,
      architecture,
    }): Promise<Resource> => {
      const sdkConfig = {
        credentials,
        region,
        retryStrategy: RETRY_STRATEGY,
      };
      const projectName = `sst-runner-${suffix}`;
      const roleArn = await createIamRoleInUserAccount();
      const projectArn = await createProjectInUserAccount();
      return {
        engine: "codebuild",
        properties: {
          role: roleArn,
          project: projectArn,
        },
      };

      async function createIamRoleInUserAccount() {
        const iam = new IAMClient(sdkConfig);
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
                      Service: "codebuild.amazonaws.com",
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
              PolicyName: "default",
              PolicyDocument: JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                  {
                    Effect: "Allow",
                    Action: "events:PutEvents",
                    Resource: "*",
                  },
                  {
                    Effect: "Allow",
                    Action: [
                      "logs:CreateLogStream",
                      "logs:CreateLogGroup",
                      "logs:PutLogEvents",
                    ],
                    Resource: [
                      `arn:aws:logs:${region}:${awsAccountExternalID}:log-group:/aws/codebuild/${projectName}`,
                      `arn:aws:logs:${region}:${awsAccountExternalID}:log-group:/aws/codebuild/${projectName}:*`,
                    ],
                  },
                  {
                    Action: [
                      "codebuild:CreateReportGroup",
                      "codebuild:CreateReport",
                      "codebuild:UpdateReport",
                      "codebuild:BatchPutTestCases",
                      "codebuild:BatchPutCodeCoverages",
                    ],
                    Resource: `arn:aws:codebuild:${region}:${awsAccountExternalID}:report-group/${projectName}-*`,
                    Effect: "Allow",
                  },
                ],
              }),
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

      async function createProjectInUserAccount() {
        const codebuild = new CodeBuildClient(sdkConfig);
        try {
          const ret = await codebuild.send(
            new CreateProjectCommand({
              name: projectName,
              serviceRole: roleArn,
              source: {
                type: "NO_SOURCE",
                buildspec: [
                  "version: 0.2",
                  "phases:",
                  "  build:",
                  "    commands:",
                  "      - curl -fsSL https://ion.sst.dev/install | bash",
                ].join("\n"),
              },
              artifacts: { type: "NO_ARTIFACTS" },
              environment: {
                computeType: "BUILD_GENERAL1_MEDIUM",
                image,
                type:
                  architecture === "x86_64"
                    ? "LINUX_CONTAINER"
                    : "ARM_CONTAINER",
                privilegedMode: true,
              },
              timeoutInMinutes: 60,
              logsConfig: {
                cloudWatchLogs: {
                  status: "ENABLED",
                },
              },
            })
          );
          return ret.project?.arn!;
        } catch (e: any) {
          if (e.name !== "EntityAlreadyExistsException") {
            throw e;
          }

          return `arn:aws:codebuild:${region}:${awsAccountExternalID}:project/${projectName}`;
        }
      }
    }
  );

  export const removeResource = zod(
    z.object({
      credentials: z.custom<Credentials>(),
      region: z.string().nonempty(),
      resource: z.custom<Resource>(),
    }),
    async ({ region, resource, credentials }) => {
      const sdkConfig = {
        credentials,
        region,
        retryStrategy: RETRY_STRATEGY,
      };
      await removeIamRoleInUserAccount();
      await removeFunctionInUserAccount();

      async function removeIamRoleInUserAccount() {
        const roleArn = resource.properties.role;
        if (!roleArn) return;
        const roleName = roleArn.split("/").pop()!;

        const iam = new IAMClient(sdkConfig);
        try {
          await iam.send(
            new DeleteRolePolicyCommand({
              RoleName: roleName,
              PolicyName: "default",
            })
          );
        } catch (e: any) {
          console.error(e);
        }

        try {
          await iam.send(new DeleteRoleCommand({ RoleName: roleName }));
        } catch (e: any) {
          console.error(e);
        }
      }

      async function removeFunctionInUserAccount() {
        if (resource.engine !== "codebuild") return;

        const codebuild = new CodeBuildClient(sdkConfig);
        try {
          await codebuild.send(
            new DeleteProjectCommand({
              name: resource.properties.project.split("/").pop()!,
            })
          );
        } catch (e: any) {
          console.error(e);
        }
      }
    }
  );

  export const invoke = zod(
    z.object({
      credentials: z.custom<Credentials>(),
      region: z.string().nonempty(),
      resource: z.custom<Resource>(),
      payload: z.custom<Run.RunnerEvent>(),
    }),
    async ({ credentials, region, resource, payload }) => {
      if (resource.engine !== "codebuild") return;

      const codebuild = new CodeBuildClient({
        credentials,
        region,
        retryStrategy: RETRY_STRATEGY,
      });
      const projectName = resource.properties.project.split("/").pop()!;
      await codebuild.send(
        new StartBuildCommand({
          projectName,
          buildspecOverride: [
            "version: 0.2",
            "phases:",
            "  build:",
            "    commands:",
            "      - touch /root/.bashrc && curl -fsSL https://ion.sst.dev/install | bash && mv /root/.sst/bin/sst /usr/local/bin/sst",
            "      - rm -rf /tmp/buildspec",
            "      - mkdir -p /tmp/buildspec",
            `      - curl -o /tmp/buildspec/index.mjs https://${payload.buildspec.bucket}.s3.amazonaws.com/buildspec/${payload.buildspec.version}/index.mjs`,
            `      - echo '{"name":"buildspec"}' > /tmp/buildspec/package.json`,
            `      - cd /tmp/buildspec && npm i @aws-sdk/client-eventbridge`,
            [
              `      - node --input-type=module -e "`,
              `import { handler } from '/tmp/buildspec/index.mjs';`,
              `const event = JSON.parse(process.env.SST_RUNNER_EVENT);`,
              `const result = await handler(event, {`,
              `  logGroupName:'/aws/codebuild/${projectName}',`,
              `  logStreamName:process.env.CODEBUILD_LOG_PATH,`,
              `});`,
              `"`,
            ].join(""),
          ].join("\n"),
          environmentVariablesOverride: [
            {
              name: "SST_RUNNER_EVENT",
              value: JSON.stringify(payload),
            },
          ],
        })
      );
    }
  );
}
