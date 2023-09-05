import { Construct } from "constructs";
import {
  DeliveryStream,
  IDestination,
  DestinationConfig,
  DestinationBindOptions,
} from "@aws-cdk/aws-kinesisfirehose-alpha";
import {
  CfnRole,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import {
  Bucket,
  Function,
  StackContext,
  KinesisStream,
  use,
} from "sst/constructs";
import { Secrets } from "./secrets";
import { Events } from "./events";
import { Storage } from "./storage";

export function Issues({ stack }: StackContext) {
  const secrets = use(Secrets);
  const bus = use(Events);

  ///////////////////////////
  // Kinesis Stream: START //
  ///////////////////////////

  const kinesisStream = new KinesisStream(stack, "issues", {
    consumers: {
      consumer: {
        function: {
          handler: "packages/functions/src/issues/kinesis-subscriber.handler",
          timeout: "15 minutes",
          memorySize: "2 GB",
          nodejs: {
            install: ["source-map"],
          },
          url: true,
          bind: [bus, use(Storage), ...Object.values(secrets.database)],
          permissions: ["sts"],
        },
      },
    },
    cdk: {
      stream: {
        shardCount: 1,
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

  new Function(stack, "tester", {
    handler: "packages/functions/src/issues/kinesis-tester.handler",
    timeout: "15 minutes",
    permissions: [
      "sts",
      "logs:PutDestination",
      "logs:PutDestinationPolicy",
      "logs:PutSubscriptionFilter",
      new PolicyStatement({
        actions: ["iam:PassRole"],
        resources: [kinesisRole.roleArn],
      }),
    ],
    bind: [bus, ...Object.values(secrets.database)],
    environment: {
      ISSUES_ROLE_ARN: kinesisRole.roleArn,
      ISSUES_STREAM_ARN: kinesisStream.streamArn,
    },
  });

  /////////////////////////
  // Kinesis Stream: END //
  /////////////////////////

  const subscriber = new Function(stack, "issues-subscriber", {
    handler: "packages/functions/src/issues/subscriber.handler",
    timeout: "15 minutes",
    memorySize: "2 GB",
    nodejs: {
      install: ["source-map"],
    },
    url: true,
    bind: [bus, use(Storage), ...Object.values(secrets.database)],
    permissions: ["sts"],
  });

  const backup = new Bucket(stack, "issues-backup");

  const stream = new DeliveryStream(stack, "issues-stream", {
    destinations: [new LambdaDestination(subscriber, backup)],
  });

  const role = new Role(stack, "issues-subscription-role", {
    assumedBy: new ServicePrincipal("logs.amazonaws.com"),
    inlinePolicies: {
      firehose: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ["firehose:PutRecord"],
            resources: [stream.deliveryStreamArn],
          }),
        ],
      }),
    },
  });

  const cfnRole = role.node.defaultChild as CfnRole;
  cfnRole.addPropertyOverride(
    "AssumeRolePolicyDocument.Statement.0.Principal.Service",
    allRegions().map((region) => `logs.${region}.amazonaws.com`)
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
        resources: [role.roleArn],
      }),
    ],
    bind: [bus, ...Object.values(secrets.database)],
    environment: {
      ISSUES_STREAM_ARN: stream.deliveryStreamArn,
      ISSUES_ROLE_ARN: role.roleArn,
    },
  });

  bus.subscribe(stack, "issue.error_detected", {
    handler: "packages/functions/src/issues/error-detected.handler",
    timeout: "1 minute",
    memorySize: "2 GB",
    nodejs: {
      install: ["source-map"],
    },
    url: true,
    bind: [bus, use(Storage), ...Object.values(secrets.database)],
    permissions: ["sts"],
  });

  return stream;
}

// The @aws-cdk/aws-kinesisfirehose-alpha package only supports S3 destinations.
// This is a temporary implementation of HTTP destination.
export class LambdaDestination implements IDestination {
  constructor(private readonly fn: Function, private readonly bucket: Bucket) {}

  bind(scope: Construct, _options: DestinationBindOptions): DestinationConfig {
    const role = new Role(scope, "DestinationRole", {
      assumedBy: new ServicePrincipal("firehose.amazonaws.com"),
    });

    return {
      // @ts-expect-error
      httpEndpointDestinationConfiguration: {
        endpointConfiguration: {
          url: this.fn.url,
        },
        bufferingHints: {
          intervalInSeconds: 60,
          sizeInMBs: 1,
        },
        roleArn: role.roleArn,
        s3BackupMode: "FailedDataOnly",
        s3Configuration: {
          bucketArn: this.bucket.cdk.bucket.bucketArn,
          roleArn: role.roleArn,
        },
      },
      dependables: [
        this.fn.grantInvokeUrl(role),
        this.bucket.cdk.bucket.grantReadWrite(role),
      ],
    };
  }
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
