import {
  CfnRole,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import {
  StackContext,
  KinesisStream,
  use,
  Config,
  Cron,
  Queue,
} from "sst/constructs";
import { Secrets } from "./secrets";
import { Events } from "./events";
import { Storage } from "./storage";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { StreamMode } from "aws-cdk-lib/aws-kinesis";
import { DNS } from "./dns";

export function Issues({ stack }: StackContext) {
  const secrets = use(Secrets);
  const bus = use(Events);

  const kinesisStream = new KinesisStream(stack, "issues", {
    consumers: {
      consumer: {
        function: {
          handler: "packages/functions/src/issues/subscriber.handler",
          timeout: "15 minutes",
          memorySize: "3008 MB",
          nodejs: {
            install: ["source-map"],
          },
          bind: [
            bus,
            use(Storage),
            ...Object.values(secrets.database),
            secrets.cloudflare,
          ],
          permissions: ["sts", "iot"],
        },
        cdk: {
          eventSource: {
            reportBatchItemFailures: true,
            bisectBatchOnError: true,
            startingPosition: StartingPosition.TRIM_HORIZON,
            parallelizationFactor: 10,
          },
        },
      },
    },
    cdk: {
      stream: {
        streamMode: StreamMode.ON_DEMAND,
      },
    },
  });

  const kinesisRole = new Role(stack, "issues-subscription", {
    assumedBy: new ServicePrincipal("logs.amazonaws.com"),
    inlinePolicies: {
      firehose: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ["kinesis:PutRecord"],
            resources: [kinesisStream.streamArn],
          }),
        ],
      }),
    },
  });
  (kinesisRole.node.defaultChild as CfnRole).addPropertyOverride(
    "AssumeRolePolicyDocument.Statement.0.Principal.Service",
    allRegions().map((region) => `logs.${region}.amazonaws.com`)
  );

  const kinesisParams = Config.Parameter.create(stack, {
    ISSUES_ROLE_ARN: kinesisRole.roleArn,
    ISSUES_STREAM_ARN: kinesisStream.streamArn,
  });

  bus.subscribe(stack, "app.stage.resources_updated", {
    handler: "packages/functions/src/issues/resources-updated.handler",
    timeout: "15 minutes",
    permissions: [
      "sts",
      "logs:DescribeDestinations",
      "logs:PutDestination",
      "logs:PutDestinationPolicy",
      "logs:PutSubscriptionFilter",
      new PolicyStatement({
        actions: ["iam:PassRole"],
        resources: [kinesisRole.roleArn],
      }),
    ],
    bind: [
      bus,
      ...Object.values(secrets.database),
      kinesisParams.ISSUES_ROLE_ARN,
      kinesisParams.ISSUES_STREAM_ARN,
      new Config.Parameter(stack, "ISSUES_DESTINATION_PREFIX", {
        value: `arn:aws:logs:<region>:${stack.account}:destination:`,
      }),
    ],
  });

  bus.subscribe(stack, "issue.rate_limited", {
    handler: "packages/functions/src/issues/rate-limited.handler",
    timeout: "1 minute",
    permissions: ["ses", "sts", "logs:DeleteDestination"],
    bind: [bus, ...Object.values(secrets.database)],
    environment: {
      EMAIL_DOMAIN: use(DNS).domain,
    },
  });

  const issueDetectedQueue = new Queue(stack, "issue-detected-queue", {
    consumer: {
      function: {
        handler: "packages/functions/src/issues/issue-detected.queue",
        permissions: ["ses"],
        bind: [...Object.values(secrets.database)],
      },
    },
    cdk: {
      queue: {
        fifo: true,
      },
    },
  });

  bus.subscribe(stack, "issue.detected", {
    handler: "packages/functions/src/issues/issue-detected.handler",
    timeout: "1 minute",
    permissions: ["ses", "sts"],
    bind: [...Object.values(secrets.database), issueDetectedQueue],
    environment: {
      EMAIL_DOMAIN: use(DNS).domain,
    },
  });

  bus.subscribe(stack, "app.stage.connected", {
    handler: "packages/functions/src/issues/stage-connected.handler",
    timeout: "1 minute",
    bind: [
      bus,
      use(Storage),
      ...Object.values(secrets.database),
      kinesisParams.ISSUES_ROLE_ARN,
      kinesisParams.ISSUES_STREAM_ARN,
    ],
    permissions: [
      "sts",
      "logs:DescribeDestinations",
      "logs:PutDestination",
      "logs:PutDestinationPolicy",
      new PolicyStatement({
        actions: ["iam:PassRole"],
        resources: [kinesisRole.roleArn],
      }),
    ],
  });

  new Cron(stack, "cleanup", {
    schedule: "cron(0 4 * * ? *)",
    job: {
      function: {
        handler: "packages/functions/src/issues/cleanup.handler",
        timeout: "15 minutes",
        bind: [...Object.values(secrets.database)],
        environment: {
          DRIZZLE_LOG: "true",
        },
      },
    },
  });
}

function allRegions() {
  return [
    "af-south-1",
    "ap-east-1",
    "ap-northeast-1",
    "ap-northeast-2",
    "ap-northeast-3",
    "ap-south-1",
    "ap-south-2",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-southeast-3",
    "ap-southeast-4",
    "ca-central-1",
    "eu-central-1",
    "eu-central-2",
    "eu-north-1",
    "eu-south-1",
    "eu-south-2",
    "eu-west-1",
    "eu-west-2",
    "eu-west-3",
    "il-central-1",
    "me-central-1",
    "me-south-1",
    "sa-east-1",
    "us-east-1",
    "us-east-2",
    "us-west-1",
    "us-west-2",
  ];
}
