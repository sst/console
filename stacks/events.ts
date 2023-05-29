import {
  EventBus,
  FunctionProps,
  Queue,
  StackContext,
  Function,
  use,
  Cron,
} from "sst/constructs";
import { Secrets } from "./secrets";
import { LambdaDestination } from "aws-cdk-lib/aws-lambda-destinations";
import { ServicePrincipal } from "aws-cdk-lib/aws-iam";

export function Events({ stack }: StackContext) {
  const bus = new EventBus(stack, "bus");
  bus.cdk.eventBus.grantPutEventsTo(
    new ServicePrincipal("events.amazonaws.com")
  );
  bus.cdk.eventBus;

  const redriver = new Queue(stack, `bus-redriver`, {
    consumer: {
      function: {
        handler: "packages/functions/src/events/redriver.handler",
        permissions: ["lambda"],
        enableLiveDev: false,
      },
    },
  });

  const onFailure = new Function(stack, `bus-onFailure`, {
    handler: "packages/functions/src/events/dlq.handler",
    enableLiveDev: false,
    bind: [redriver],
  });

  function subscribe(name: string, fn: FunctionProps) {
    const stripped = name.replace(/\./g, "_");
    bus.addRules(stack, {
      [stripped]: {
        pattern: {
          detailType: [name],
        },
        targets: {
          handler: {
            function: {
              ...fn,
              onFailure: new LambdaDestination(onFailure),
            },
          },
        },
      },
    });
  }

  const secrets = use(Secrets);

  const fn = new Function(stack, "stack-updated-external", {
    handler: "packages/functions/src/events/stack-updated-external.handler",
    bind: [bus, ...Object.values(secrets.database)],
    permissions: ["sts"],
  });
  fn.grantInvoke(new ServicePrincipal("s3.amazonaws.com"));
  fn.grantInvoke(new ServicePrincipal("iot.amazonaws.com"));
  fn.grantInvoke(new ServicePrincipal("events.amazonaws.com"));

  bus.addRules(stack, {
    "cross-account": {
      pattern: {
        source: ["aws.s3"],
      },
      targets: {
        handler: {
          function: fn,
        },
      },
    },
  });

  subscribe("aws.account.created", {
    handler: "packages/functions/src/events/aws-account-created.handler",
    bind: [...Object.values(secrets.database), fn],
    permissions: ["sts"],
  });

  subscribe("app.stage.connected", {
    handler: "packages/functions/src/events/app-stage-connected.handler",
    bind: [...Object.values(secrets.database)],
    permissions: ["sts"],
    environment: {
      STACK_UPDATED_EXTERNAL_ARN: fn.functionArn,
      EVENT_BUS_ARN: bus.eventBusArn,
    },
  });

  subscribe("app.stage.updated", {
    handler: "packages/functions/src/events/app-stage-updated.handler",
    bind: [...Object.values(secrets.database)],
    permissions: ["sts"],
  });

  return bus;
}
