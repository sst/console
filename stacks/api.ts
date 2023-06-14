import {
  Choice,
  Condition,
  Pass,
  StateMachine,
  Wait,
  WaitTime,
} from "aws-cdk-lib/aws-stepfunctions";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { StackContext, Api, use, Function } from "sst/constructs";
import { Auth } from "./auth";
import { Secrets } from "./secrets";
import { Events } from "./events";
import { DNS } from "./dns";
import { Duration } from "aws-cdk-lib/core";

export function API({ stack }: StackContext) {
  const auth = use(Auth);
  const secrets = use(Secrets);
  const bus = use(Events);
  const dns = use(DNS);

  const pollerFetchStep = new LambdaInvoke(stack, "pollerFetchStep", {
    lambdaFunction: Function.fromDefinition(stack, "log-poller-fetch", {
      handler: "packages/functions/src/poller/fetch.handler",
      permissions: ["logs"],
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

  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [auth, ...Object.values(secrets.database), bus],
        permissions: ["iot"],
      },
    },
    routes: {
      "POST /replicache/pull": "packages/functions/src/replicache/pull.handler",
      "POST /replicache/push": "packages/functions/src/replicache/push.handler",
    },
    customDomain: {
      domainName: "api." + dns.domain,
      hostedZone: dns.zone,
    },
  });

  poller.grantStartExecution(api.getFunction("POST /replicache/push")!);

  stack.addOutputs({
    ApiEndpoint: api.customDomainUrl,
    Output: "",
  });

  return api;
}
