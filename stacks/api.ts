import {
  Choice,
  Condition,
  Pass,
  StateMachine,
  Wait,
  WaitTime,
} from "aws-cdk-lib/aws-stepfunctions";
import * as events from "aws-cdk-lib/aws-events";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { StackContext, Api, use, Function, EventBus } from "sst/constructs";
import { Auth } from "./auth";
import { Secrets } from "./secrets";
import { Events } from "./events";
import { DNS } from "./dns";
import { Duration } from "aws-cdk-lib/core";

export function API({ stack, app }: StackContext) {
  const auth = use(Auth);
  const secrets = use(Secrets);
  const bus = use(Events);
  const dns = use(DNS);

  const pollerFetchStep = new LambdaInvoke(stack, "pollerFetchStep", {
    lambdaFunction: Function.fromDefinition(stack, "log-poller-fetch", {
      handler: "packages/functions/src/poller/fetch.handler",
      bind: [...Object.values(secrets.database)],
      timeout: "120 seconds",
      permissions: ["logs", "sts", "iot"],
    }),
    payloadResponseOnly: true,
    resultPath: "$.status",
  });

  const poller = new StateMachine(stack, "poller", {
    definition: pollerFetchStep.next(
      new Choice(stack, "pollerLoopStep")
        .when(
          Condition.booleanEquals("$.status.done", false),
          new Wait(stack, "pollerWaitStep", {
            time: WaitTime.duration(Duration.seconds(3)),
          }).next(pollerFetchStep)
        )
        .otherwise(new Pass(stack, "done"))
    ),
  });

  new EventBus(stack, "defaultBus", {
    cdk: {
      eventBus: events.EventBus.fromEventBusName(stack, "default", "default"),
    },
  }).addRules(stack, {
    "log-poller-status": {
      pattern: {
        detailType: ["Step Functions Execution Status Change"],
        source: ["aws.states"],
      },
      targets: {
        handler: {
          function: {
            handler: "packages/functions/src/events/log-poller-status.handler",
            bind: [bus, ...Object.values(secrets.database)],
            permissions: ["states"],
            environment: {
              LOG_POLLER_ARN: poller.stateMachineArn,
            },
          },
        },
      },
    },
  });

  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [auth, ...Object.values(secrets.database), bus],
        permissions: ["iot", "sts"],
        environment: {
          LOG_POLLER_ARN: poller.stateMachineArn,
        },
      },
    },
    routes: {
      "POST /replicache/pull": "packages/functions/src/replicache/pull.handler",
      "POST /replicache/push": "packages/functions/src/replicache/push.handler",
      "GET /error": {
        type: "function",
        function: {
          handler: "packages/functions/src/error.handler",
          enableLiveDev: false,
        },
      },
    },
    customDomain: {
      domainName: "api." + dns.domain,
      hostedZone: dns.zone.zoneName,
    },
  });

  poller.grantStartExecution(api.getFunction("POST /replicache/push")!);

  new Function(stack, "scratch", {
    bind: [auth, ...Object.values(secrets.database), bus],
    handler: "packages/functions/src/scratch.handler",
  });

  stack.addOutputs({
    ApiEndpoint: api.customDomainUrl,
  });

  return api;
}
