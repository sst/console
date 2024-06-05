import fs from "fs";
import { createHash } from "crypto";
import {
  Bucket,
  Config,
  Cron,
  Function,
  StackContext,
  use,
} from "sst/constructs";
import {
  Repository,
  CfnReplicationConfiguration,
  IRepository,
} from "aws-cdk-lib/aws-ecr";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { CfnScheduleGroup } from "aws-cdk-lib/aws-scheduler";
import { allRegions } from "./util/regions";
import {
  AnyPrincipal,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Secrets } from "./secrets";

export function Run({ stack, app }: StackContext) {
  const secrets = use(Secrets);

  /****************/
  /* Build script */
  /****************/
  const bucket = new Bucket(stack, "Buildspec", {
    cdk: {
      bucket: {
        publicReadAccess: true,
      },
    },
  });
  // Calculate buildspec hash
  const filePath = "packages/build/buildspec/index.mjs";
  const content = fs.readFileSync(filePath);
  const version = createHash("sha256").update(content).digest("hex");
  new BucketDeployment(stack, "BuildspecDeployment", {
    destinationBucket: bucket.cdk.bucket,
    destinationKeyPrefix: `buildspec/${version}`,
    sources: [
      Source.asset("packages/build/buildspec", {
        assetHash: version,
      }),
    ],
  });

  /***************/
  /* Build image */
  /***************/
  // Create only 1 ECR repository per region b/c the Replication is a region-level
  // resource. It cannot be created on a per user bases.
  const repoName = `${app.name}-images`;
  let repo: IRepository;
  if (app.stage !== "jayair" && app.stage !== "thdxr") {
    repo = new Repository(stack, "Repository", {
      repositoryName: repoName,
    });
    repo.addToResourcePolicy(
      new PolicyStatement({
        actions: ["ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage"],
        principals: [new ServicePrincipal("lambda.amazonaws.com")],
      })
    );
    repo.addToResourcePolicy(
      new PolicyStatement({
        actions: ["ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage"],
        principals: [new AnyPrincipal()],
        conditions: {
          StringEquals: {
            "aws:RequestedRegion": stack.region,
          },
        },
      })
    );

    new CfnReplicationConfiguration(stack, "Replication", {
      replicationConfiguration: {
        rules: [
          {
            destinations: allRegions
              .filter((region) => region !== stack.region)
              .filter((region) => !region.startsWith("ap-"))
              .map((region) => ({
                region,
                registryId: stack.account,
              })),
            repositoryFilters: [
              {
                filterType: "PREFIX_MATCH",
                filter: repoName,
              },
            ],
          },
        ],
      },
    });
  } else {
    repo = Repository.fromRepositoryName(stack, "Repository", repoName);
  }

  /*************************/
  /* Build timeout monitor */
  /*************************/
  const runTimeoutMonitorScheduleGroup = new CfnScheduleGroup(
    stack,
    "RunTimeoutMonitor",
    {
      name: app.logicalPrefixedName("RunTimeoutMonitor"),
    }
  );
  const runTimeoutMonitor = new Function(stack, "RunTimeoutHandler", {
    bind: [...Object.values(secrets.database)],
    handler: "packages/functions/src/run/monitor.handler",
    permissions: ["sts", "iot"],
  });
  const scheduleRole = new Role(stack, "ScheduleRole", {
    assumedBy: new ServicePrincipal("scheduler.amazonaws.com"),
    inlinePolicies: {
      InvokeLambda: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ["lambda:InvokeFunction"],
            resources: ["*"],
          }),
        ],
      }),
    },
  });

  /******************/
  /* Runner remover */
  /******************/
  const runnerRemoverScheduleGroup = new CfnScheduleGroup(
    stack,
    "RunnerRemover",
    {
      name: app.logicalPrefixedName("RunnerRemover"),
    }
  );
  const runnerRemover = new Function(stack, "RunnerRemoverHandler", {
    bind: [...Object.values(secrets.database)],
    handler: "packages/functions/src/run/runner-remover.handler",
    environment: {
      RUNNER_REMOVER_SCHEDULE_GROUP_NAME: runnerRemoverScheduleGroup.name!,
      RUNNER_REMOVER_SCHEDULE_ROLE_ARN: scheduleRole.roleArn,
      //RUNNER_REMOVER_FUNCTION_ARN: this will be set in the handler
    },
    permissions: ["sts", "iot", "scheduler:CreateSchedule", "iam:PassRole"],
  });

  /*********************/
  /* SST config parser */
  /*********************/
  const configParser = new Function(stack, "ConfigParser", {
    handler: "packages/functions/src/run/config-parser.handler",
    timeout: "1 minute",
    nodejs: {
      install: ["esbuild"],
    },
  });

  return {
    configParser,
    runTimeoutMonitorScheduleGroupName: runTimeoutMonitorScheduleGroup.name!,
    runTimeoutMonitorArn: runTimeoutMonitor.functionArn,
    runnerRemoverScheduleGroupName: runnerRemoverScheduleGroup.name!,
    runnerRemoverArn: runnerRemover.functionArn,
    scheduleRoleArn: scheduleRole.roleArn,
    buildspecBucket: bucket,
    buildspecVersion: new Config.Parameter(stack, "BUILDSPEC_VERSION", {
      value: version,
    }),
    image: new Config.Parameter(stack, "IMAGE_URI", {
      value: repo.repositoryUri,
    }),
  };
}
