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
  toCdkDuration,
} from "sst/constructs";
import { Secrets } from "./secrets";
import { Events } from "./events";
import { Storage } from "./storage";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { StreamMode } from "aws-cdk-lib/aws-kinesis";
import { DNS } from "./dns";
import * as actions from "aws-cdk-lib/aws-cloudwatch-actions";
import { Alerts } from "./alerts";
import { allRegions } from "./util/regions";

export function Issues({ stack }: StackContext) {
  const secrets = use(Secrets);
  const bus = use(Events);

  const kinesisStream = new KinesisStream(stack, "issues", {
    consumers: {
      consumer: {
        function: {
          handler: "packages/functions/src/issues/subscriber.handler",
          timeout: "15 minutes",
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
  kinesisStream.cdk.stream
    .metricGetRecordsIteratorAgeMilliseconds()
    .createAlarm(stack, "issues-iterator-age", {
      threshold: 1000 * 60,
      evaluationPeriods: 3,
    })
    .addAlarmAction(new actions.SnsAction(use(Alerts)));

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
    allRegions.map((region) => `logs.${region}.amazonaws.com`),
  );

  const kinesisParams = Config.Parameter.create(stack, {
    ISSUES_ROLE_ARN: kinesisRole.roleArn,
    ISSUES_STREAM_ARN: kinesisStream.streamArn,
  });

  const issuesDestinationPrefix = new Config.Parameter(
    stack,
    "ISSUES_DESTINATION_PREFIX",
    {
      value: `arn:aws:logs:<region>:${stack.account}:destination:`,
    },
  );
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
      issuesDestinationPrefix,
    ],
  });

  bus.subscribe(["state.history.synced"], {
    handler: "packages/functions/src/events/state-history-synced.handler",
    bind: [...Object.values(secrets.database), issuesDestinationPrefix],
    permissions: ["sts", "iot"],
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
        timeout: "5 minute",
        bind: [...Object.values(secrets.database)],
        environment: {
          EMAIL_DOMAIN: use(DNS).domain,
        },
      },
    },
    cdk: {
      queue: {
        fifo: true,
        visibilityTimeout: toCdkDuration("5 minute"),
      },
    },
  });

  bus.subscribe(stack, "issue.detected", {
    handler: "packages/functions/src/issues/issue-detected.handler",
    timeout: "15 minute",
    permissions: ["sts"],
    bind: [...Object.values(secrets.database), issueDetectedQueue],
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
