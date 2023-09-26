import {
  Choice,
  Condition,
  DefinitionBody,
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
import { Storage } from "./storage";

export function API({ stack, app }: StackContext) {
  const auth = use(Auth);
  const secrets = use(Secrets);
  const bus = use(Events);
  const dns = use(DNS);
  const storage = use(Storage);

  const pollerFetchStep = new LambdaInvoke(stack, "pollerFetchStep", {
    lambdaFunction: Function.fromDefinition(stack, "log-poller-fetch", {
      handler: "packages/functions/src/poller/fetch.handler",
      bind: [...Object.values(secrets.database), storage],
      nodejs: {
        install: ["source-map"],
      },
      timeout: "120 seconds",
      permissions: ["logs", "sts", "iot"],
    }),
    payloadResponseOnly: true,
    resultPath: "$.status",
  });

  const poller = new StateMachine(stack, "poller", {
    definitionBody: DefinitionBody.fromChainable(
      pollerFetchStep.next(
        new Choice(stack, "pollerLoopStep")
          .when(
            Condition.booleanEquals("$.status.done", false),
            new Wait(stack, "pollerWaitStep", {
              time: WaitTime.duration(Duration.seconds(3)),
            }).next(pollerFetchStep),
          )
          .otherwise(new Pass(stack, "done")),
      ),
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
            permissions: ["states", "iot"],
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
        timeout: "29 seconds",
        bind: [
          auth,
          ...Object.values(secrets.database),
          ...secrets.stripe,
          bus,
        ],
        permissions: ["iot", "sts"],
        environment: {
          LOG_POLLER_ARN: poller.stateMachineArn,
        },
      },
    },
    routes: {
      "POST /replicache/pull": {
        function: {
          handler: "packages/functions/src/replicache/pull.handler",
        },
      },
      "POST /replicache/push": "packages/functions/src/replicache/push.handler",
      "POST /replicache/pull1": {
        function: {
          handler: "packages/functions/src/replicache/pull1.handler",
        },
      },
      "POST /replicache/dummy/pull": {
        function: {
          handler: "packages/functions/src/replicache/dummy/pull.handler",
        },
      },
      "POST /replicache/push1":
        "packages/functions/src/replicache/push1.handler",
      "POST /webhook/stripe": "packages/functions/src/billing/webhook.handler",
      "POST /rest/create_checkout_session":
        "packages/functions/src/billing/create-checkout-session.handler",
      "POST /rest/create_customer_portal_session":
        "packages/functions/src/billing/create-customer-portal-session.handler",
      "GET /rest/log": "packages/functions/src/log/expand.handler",
      "GET /freshpaint/track": {
        type: "url",
        url: "https://api.perfalytics.com/track",
      },
      "POST /freshpaint/track": {
        type: "url",
        url: "https://api.perfalytics.com/track",
      },
      "GET /freshpaint/{proxy+}": {
        type: "url",
        url: "https://perfalytics.com/{proxy}",
      },
    },
    customDomain: {
      domainName: "api." + dns.domain,
      hostedZone: dns.zone.zoneName,
    },
  });

  api.addRoutes(stack, {
    "GET /test/error": {
      type: "function",
      function: {
        handler: "packages/functions/src/error.handler",
        enableLiveDev: false,
      },
    },
    // "GET /test/go": {
    //   type: "function",
    //   function: {
    //     runtime: "go",
    //     handler: "./go/handler.go",
    //     enableLiveDev: false,
    //   },
    // },
  });

  poller.grantStartExecution(api.getFunction("POST /replicache/push")!);
  poller.grantStartExecution(api.getFunction("POST /replicache/push1")!);

  new Function(stack, "scratch", {
    bind: [auth, ...Object.values(secrets.database), bus],
    handler: "packages/functions/src/scratch.handler",
  });

  stack.addOutputs({
    ApiEndpoint: api.customDomainUrl,
  });

  return api;
}
