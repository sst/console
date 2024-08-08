import { EventBus, StackContext, use } from "sst/constructs";
import { Secrets } from "./secrets";
import { Storage } from "./storage";
import { DNS } from "./dns";

export function Events({ stack }: StackContext) {
  const bus = new EventBus(stack, "bus", {
    defaults: {
      retries: 20,
    },
  });

  const secrets = use(Secrets);
  const storage = use(Storage);

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

  bus.subscribe("workspace.created", {
    handler: "packages/functions/src/events/workspace-created.handler",
    timeout: "5 minute",
    bind: [...Object.values(secrets.database), ...secrets.stripe, bus],
    permissions: ["sts", "iot"],
  });

  bus.subscribe("app.stage.connected", {
    handler: "packages/functions/src/events/app-stage-connected.handler",
    timeout: "5 minute",
    bind: [...Object.values(secrets.database), bus],
    permissions: ["sts", "iot"],
  });

  bus.subscribe("app.stage.updated", {
    handler: "packages/functions/src/events/app-stage-updated.handler",
    bind: [...Object.values(secrets.database), bus],
    timeout: "15 minute",
    permissions: ["sts", "iot"],
  });

  bus.subscribe("app.stage.usage_requested", {
    handler: "packages/functions/src/events/fetch-usage.handler",
    bind: [...Object.values(secrets.database), ...secrets.stripe, bus],
    timeout: "5 minute",
    permissions: ["sts", "iot"],
  });

  bus.subscribe("aws.account.created", {
    handler: "packages/functions/src/events/aws-account-created.handler",
    bind: [...Object.values(secrets.database), bus],
    timeout: "5 minute",
    permissions: ["sts", "iot"],
    environment: {
      EVENT_BUS_ARN: bus.eventBusArn,
    },
  });

  bus.subscribe("aws.account.removed", {
    handler: "packages/functions/src/events/aws-account-removed.handler",
    bind: [...Object.values(secrets.database), bus],
    timeout: "5 minute",
    permissions: ["sts", "iot"],
    environment: {
      EVENT_BUS_ARN: bus.eventBusArn,
    },
  });

  bus.subscribe("github.installed", {
    handler: "packages/functions/src/events/github-installed.handler",
    bind: [...Object.values(secrets.database), bus, ...secrets.github],
    timeout: "15 minute",
    permissions: ["sts", "iot"],
  });

  bus.subscribe("user.created", {
    handler: "packages/functions/src/events/user-created.handler",
    permissions: ["ses"],
    bind: [...Object.values(secrets.database)],
    environment: {
      EMAIL_DOMAIN: use(DNS).domain,
    },
  });

  bus.subscribe(
    "log.search.created",
    {
      handler: "packages/functions/src/events/log-scan-created.handler",
      nodejs: {
        install: ["source-map"],
      },
      bind: [...Object.values(secrets.database), storage, bus],
      timeout: "5 minute",
      permissions: ["sts", "iot"],
    },
    {
      retries: 0,
    },
  );

  bus.subscribe(["state.lock.created"], {
    handler: "packages/functions/src/events/state-lock-created.handler",
    bind: [...Object.values(secrets.database)],
    permissions: ["sts", "iot"],
  });

  bus.subscribe(["state.summary.created"], {
    handler: "packages/functions/src/events/state-summary-created.handler",
    bind: [...Object.values(secrets.database)],
    permissions: ["sts", "iot"],
  });

  bus.subscribe(["state.history.created"], {
    handler: "packages/functions/src/events/state-history-created.handler",
    timeout: "1 minute",
    bind: [...Object.values(secrets.database), bus],
    permissions: ["sts", "iot"],
  });

  return bus;
}
