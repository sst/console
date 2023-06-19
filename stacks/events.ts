import { EventBus, StackContext, Function, use } from "sst/constructs";
import { Secrets } from "./secrets";
import * as events from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";

export function Events({ stack }: StackContext) {
  const bus = new EventBus(stack, "bus", {
    defaults: {
      retries: 20,
    },
  });

  const secrets = use(Secrets);

  bus.addRules(stack, {
    "cross-account": {
      pattern: {
        source: ["aws.s3"],
      },
      targets: {
        handler: {
          function: {
            handler:
              "packages/functions/src/events/stack-updated-external.handler",
            bind: [bus, ...Object.values(secrets.database)],
          },
        },
      },
    },
  });

  bus.subscribe("app.stage.connected", {
    handler: "packages/functions/src/events/app-stage-connected.handler",
    bind: [...Object.values(secrets.database)],
    permissions: ["sts"],
    environment: {
      EVENT_BUS_ARN: bus.eventBusArn,
    },
  });

  bus.subscribe("app.stage.updated", {
    handler: "packages/functions/src/events/app-stage-updated.handler",
    bind: [...Object.values(secrets.database)],
    permissions: ["sts"],
  });

  return bus;
}
