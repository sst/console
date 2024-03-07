import { Cron, Queue, StackContext, use } from "sst/constructs";
import { Secrets } from "./secrets";
import { Events } from "./events";
import { Duration } from "aws-cdk-lib/core";

export function Billing({ stack }: StackContext) {
  const secrets = use(Secrets);
  const bus = use(Events);
  const usageQueue = new Queue(stack, "UsageQueue", {
    cdk: {
      queue: {
        fifo: true,
        visibilityTimeout: Duration.seconds(180),
      },
    },
    consumer: {
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
      function: {
        handler: "packages/functions/src/events/fetch-usage.handler",
        bind: [...Object.values(secrets.database), ...secrets.stripe, bus],
        permissions: ["sts", "iot"],
        timeout: "3 minutes",
      },
    },
  });
  new Cron(stack, "fetch-usage", {
    schedule: "cron(0 5 * * ? *)", // 5am UTC
    job: {
      function: {
        handler: "packages/functions/src/billing/cron.handler",
        timeout: "15 minutes",
        url: true,
        permissions: ["sts"],
        bind: [bus, ...Object.values(secrets.database), usageQueue],
      },
    },
  });
}
