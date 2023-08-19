import { Cron, StackContext, use } from "sst/constructs";
import { Secrets } from "./secrets";
import { Events } from "./events";

export function Billing({ stack }: StackContext) {
  const secrets = use(Secrets);
  const bus = use(Events);
  new Cron(stack, "fetch-usage", {
    schedule: "cron(0 5 * * ? *)", // 5am UTC
    job: {
      function: {
        handler: "packages/functions/src/billing/cron.handler",
        timeout: "15 minutes",
        url: true,
        permissions: ["sts"],
        bind: [bus, ...Object.values(secrets.database)],
      },
    },
  });
}
