import fs from "fs";
import { createHash } from "crypto";
import { Bucket, Config, Function, StackContext, use } from "sst/constructs";
import { Repository, CfnReplicationConfiguration } from "aws-cdk-lib/aws-ecr";
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
import { time } from "drizzle-orm/pg-core";

export function Run({ stack, app }: StackContext) {
  const secrets = use(Secrets);

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

  const repo = new Repository(stack, "Repository", {
    repositoryName: "images",
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
              filter: "images",
            },
          ],
        },
      ],
    },
  });

  const scheduleGroup = new CfnScheduleGroup(stack, "RunTimeoutMonitor", {
    name: app.logicalPrefixedName("RunTimeoutMonitor"),
  });
  const timeoutMonitor = new Function(stack, "RunTimeoutHandler", {
    bind: [...Object.values(secrets.database)],
    permissions: ["scheduler:DeleteSchedule"],
    handler: "packages/functions/src/run/monitor.handler",
  });
  const scheduleRole = new Role(stack, "RunTimeoutMonitorRole", {
    assumedBy: new ServicePrincipal("scheduler.amazonaws.com"),
    inlinePolicies: {
      InvokeLambda: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ["lambda:InvokeFunction"],
            resources: [timeoutMonitor.functionArn],
          }),
        ],
      }),
    },
  });

  return {
    scheduleGroupName: scheduleGroup.name!,
    scheduleRoleArn: scheduleRole.roleArn,
    timeoutMonitorArn: timeoutMonitor.functionArn,
    buildspecBucket: bucket,
    buildspecVersion: new Config.Parameter(stack, "BUILDSPEC_VERSION", {
      value: version,
    }),
    image: new Config.Parameter(stack, "IMAGE_URI", {
      value: repo.repositoryUri,
    }),
  };
}
