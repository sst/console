import { DateTime } from "luxon";
import { AWS } from "@console/core/aws";
import { User } from "@console/core/user";
import { Issue } from "@console/core/issue";
import { App, Stage } from "@console/core/app";
import { Warning } from "@console/core/warning";
import type { Usage } from "@console/core/billing";
import { Workspace } from "@console/core/workspace";
import { Resource } from "@console/core/app/resource";

const USER_ID = "me@example.com";

const APP_ID = "1";
const APP_ID_LONG = "2";
const APP_LOCAL = "my-sst-app";

const STAGE_LOCAL = "jayair";
const STAGE_EMPTY = "stage-empty";
const STAGE_NOT_SUPPORTED = "stage-not-supported";
const STAGE_PARTLY_SUPPORTED = "stage-partly-supported";

const ACCOUNT_ID = "connected";
const ACCOUNT_ID_FULL = "full";
const ACCOUNT_ID_FAILED = "failed";
const ACCOUNT_ID_LONG_APPS = "long";
const ACCOUNT_ID_SYNCING = "syncing";
const ACCOUNT_ID_SYNCING_FULL = "syncing-full";

const FUNC_ARN_SSR = "arn:aws:lambda:us-east-1:123456789012:function:my-func";
const FUNC_ARN_NEXTJS = "arn:aws:lambda:us-east-1:123456789012:function:nextjs";

const timestamps = {
  timeCreated: DateTime.now().startOf("day").toSQL()!,
  timeUpdated: DateTime.now().startOf("day").toSQL()!,
};

export type DummyMode =
  | "empty"
  | "overview:base;resource:base"
  | "overview:all;usage:overage;subscription:active";

export interface DummyConfig {
  local: {
    app: string;
    stage: string;
  };
  user: string;
}

type DummyData =
  | (DummyConfig & {
      _type: "dummyConfig";
    })
  | (Workspace.Info & { _type: "workspace" })
  | (Omit<Usage, "workspaceID"> & { _type: "usage" })
  | (Omit<App.Info, "workspaceID"> & { _type: "app" })
  | (Omit<User.Info, "workspaceID"> & { _type: "user" })
  | (Omit<Stage.Info, "workspaceID"> & { _type: "stage" })
  | (Omit<Issue.Info, "workspaceID"> & { _type: "issue" })
  | (Omit<Warning.Info, "workspaceID"> & { _type: "warning" })
  | (Omit<Resource.Info, "workspaceID"> & { _type: "resource" })
  | (Omit<AWS.Account.Info, "workspaceID"> & { _type: "awsAccount" });

function stringToObject(input: string): { [key: string]: string } {
  const result: { [key: string]: string } = {};

  const pairs = input.split(";");
  for (let pair of pairs) {
    const [key, value] = pair.split(":");
    if (key && value) {
      result[key.trim()] = value.trim();
    }
  }

  return result;
}

interface WorkspaceProps {
  id: string;
  activeSubscription?: boolean;
}
function workspace({ id, activeSubscription }: WorkspaceProps): DummyData {
  return {
    _type: "workspace",
    id,
    slug: id,
    timeDeleted: null,
    stripeSubscriptionItemID: null,
    stripeCustomerID: null,
    stripeSubscriptionID: activeSubscription ? "sub_123" : null,
    ...timestamps,
  };
}

interface UserProps {
  id?: string;
  email: string;
  active?: boolean;
  deleted?: boolean;
}
function user({ id, email, active, deleted }: UserProps): DummyData {
  return {
    _type: "user",
    email,
    id: id || email,
    timeSeen: active ? timestamps.timeUpdated : null,
    timeDeleted: deleted ? timestamps.timeUpdated : null,
    ...timestamps,
  };
}

interface AccountProps {
  id: string;
  failed?: boolean;
  accountID: string;
  syncing?: boolean;
}
function account({ id, accountID, failed, syncing }: AccountProps): DummyData {
  return {
    _type: "awsAccount",
    id,
    accountID: accountID,
    timeDeleted: null,
    timeFailed: failed ? timestamps.timeUpdated : null,
    timeDiscovered: syncing ? null : timestamps.timeUpdated,
    ...timestamps,
  };
}

interface StageProps {
  id: string;
  appID: string;
  region?: string;
  awsAccountID: string;
}
function stage({ id, appID, region, awsAccountID }: StageProps): DummyData {
  return {
    _type: "stage",
    id,
    appID,
    name: id,
    awsAccountID,
    timeDeleted: null,
    region: region || "us-east-1",
    ...timestamps,
  };
}

interface AppProps {
  id: string;
  name?: string;
}
function app({ id, name }: AppProps): DummyData {
  return {
    _type: "app",
    id,
    name: name || id,
    timeDeleted: null,
    ...timestamps,
  };
}

interface UsageProps {
  day: string;
  invocations: number;
}
function usage({ day, invocations }: UsageProps): DummyData {
  return {
    _type: "usage",
    day,
    id: day,
    invocations,
    stageID: "stage-account-overage",
    timeDeleted: null,
    ...timestamps,
  };
}

function resource<Type extends Resource.Info["type"]>(props: {
  type: Type;
  id: string;
  stage: string;
  metadata?: Extract<Resource.Info, { type: Type }>["metadata"];
  enrichment?: Extract<Resource.Info, { type: Type }>["enrichment"];
}): DummyData {
  const { id, type, stage, metadata = {}, enrichment = {} } = props;
  return {
    _type: "resource",
    id,
    addr: id,
    cfnID: id,
    enrichment,
    stageID: stage,
    constructID: id,
    stackID: "stack",
    timeDeleted: null,
    type: type as any,
    metadata: metadata as any,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
  };
}

interface FuncProps {
  id: string;
  arn?: string;
  size?: number;
  stage: string;
  live?: boolean;
  handler: string;
  runtime?: Extract<Resource.Info, { type: "Function" }>["metadata"]["runtime"];
}
function func({
  id,
  arn,
  size,
  live,
  stage,
  handler,
  runtime,
}: FuncProps): DummyData {
  return resource({
    id,
    stage,
    type: "Function",
    metadata: {
      handler,
      localId: id,
      secrets: [],
      runtime: runtime || "nodejs18.x",
      arn: arn || "arn:aws:lambda:us-east-1:123456789012:function:my-func",
    },
    enrichment: {
      size: size || 2048,
      live: live || false,
      // @ts-ignore
      runtime: runtime || "nodejs18.x",
    },
  });
}

function ref(node: string, stack: string) {
  return {
    node,
    stack,
  };
}

export function* generateData(
  mode: DummyMode
): Generator<DummyData, void, unknown> {
  console.log("generating for", mode);

  const modeMap = stringToObject(mode);

  yield workspace({
    id: "dummy-workspace",
    activeSubscription: modeMap["subscription"] === "active",
  });

  yield {
    _type: "dummyConfig",
    user: USER_ID,
    local: {
      app: APP_LOCAL,
      stage: STAGE_LOCAL,
    },
  };

  yield user({ email: USER_ID, active: true });
  yield user({ email: "invited-dummy@example.com" });
  yield user({ email: "invited-dummy-with-long-email-address@example.com" });
  yield user({
    email: "deleted-dummy@example.com",
    active: true,
    deleted: true,
  });

  yield usage({ day: "2021-01-01", invocations: 100 });

  if (modeMap["overview"] === "full") {
    for (let i = 0; i < 30; i++) {
      yield user({ email: `dummy${i}@example.com`, active: true });
    }
  }

  if (modeMap["overview"]) yield* overviewBase();

  if (modeMap["resources"]) {
    yield* resourcesBase();
    yield* resourcesNotSupported();
    yield* resourcesPartlySupported();
  }

  if (modeMap["overview"] === "full") yield* overviewFull();

  if (modeMap["usage"] === "overage")
    yield usage({ day: "2021-01-01", invocations: 12300000000 });
}

function* overviewBase(): Generator<DummyData, void, unknown> {
  yield account({ id: ACCOUNT_ID, accountID: "123456789012" });
  yield app({ id: APP_LOCAL });
  yield stage({
    id: STAGE_LOCAL,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
  yield stage({
    id: STAGE_EMPTY,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
  yield stage({
    id: STAGE_NOT_SUPPORTED,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
  yield stage({
    id: STAGE_PARTLY_SUPPORTED,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
}

function* overviewFull(): Generator<DummyData, void, unknown> {
  yield* overviewLongApps();

  yield app({ id: APP_ID, name: "my-sst-app" });
  yield account({
    id: "syncing-empty",
    accountID: "123456789013",
    syncing: true,
  });
  yield account({
    id: "failed-empty",
    accountID: "123456789014",
    failed: true,
  });
  yield account({ id: "empty", accountID: "123456789015" });
  yield account({
    id: ACCOUNT_ID_FAILED,
    accountID: "123456789016",
    failed: true,
  });
  yield stage({
    id: "stage-account-failed",
    appID: APP_ID,
    region: "ap-southeast-1",
    awsAccountID: ACCOUNT_ID_FAILED,
  });
  yield account({
    id: ACCOUNT_ID_SYNCING,
    accountID: "123456789017",
    syncing: true,
  });
  yield account({
    id: ACCOUNT_ID_SYNCING_FULL,
    accountID: "123456789019",
    syncing: true,
  });
  yield stage({
    id: "stage-account-syncing",
    appID: APP_ID,
    awsAccountID: ACCOUNT_ID_SYNCING,
  });
  yield account({ id: ACCOUNT_ID_FULL, accountID: "123456789018" });

  for (let i = 0; i < 30; i++) {
    yield stage({
      id: `stage-${i}`,
      appID: APP_ID,
      awsAccountID: ACCOUNT_ID_FULL,
    });
  }

  for (let i = 0; i < 10; i++) {
    yield stage({
      id: `stage-${i}`,
      appID: APP_ID,
      awsAccountID: ACCOUNT_ID_SYNCING_FULL,
    });
  }
}

function* overviewLongApps(): Generator<DummyData, void, unknown> {
  yield account({ id: ACCOUNT_ID_LONG_APPS, accountID: "123456789020" });
  yield app({
    id: APP_ID_LONG,
    name: "my-sst-app-that-has-a-really-long-name-that-should-be-truncated",
  });
  yield stage({
    id: "stage-long-id-1",
    appID: APP_ID_LONG,
    awsAccountID: ACCOUNT_ID_LONG_APPS,
  });
  yield stage({
    id: "this-stage-name-is-really-long-and-needs-to-be-truncated",
    appID: APP_ID_LONG,
    region: "ap-southeast-1",
    awsAccountID: ACCOUNT_ID_LONG_APPS,
  });
}

function* resourcesBase(): Generator<DummyData, void, unknown> {
  const STACK = "stack";

  yield func({
    id: "index",
    stage: STAGE_LOCAL,
    handler: "packages/function.handler",
  });
  yield func({
    id: "notes_get",
    stage: STAGE_LOCAL,
    handler: "packages/notes.handler",
    size: 20400800000,
  });
  yield func({
    id: "notes_post",
    stage: STAGE_LOCAL,
    handler: "packages/notes.handler",
    size: 2048000,
  });
  yield func({
    id: "go_func",
    stage: STAGE_LOCAL,
    handler: "packages/others/go.handler",
    size: 204123,
    runtime: "go1.x",
  });
  yield func({
    id: "java_func",
    stage: STAGE_LOCAL,
    handler: "packages/others/java.handler",
    size: 204123,
    runtime: "java17",
  });
  yield func({
    id: "node_func",
    stage: STAGE_LOCAL,
    handler: "packages/others/node.handler",
    size: 204123,
    runtime: "nodejs18.x",
  });
  yield func({
    id: "python_func",
    stage: STAGE_LOCAL,
    handler: "packages/others/python.handler",
    size: 204123,
    runtime: "python3.10",
  });
  yield func({
    id: "dotnet_func",
    stage: STAGE_LOCAL,
    handler: "packages/others/dotnet.handler",
    size: 204123,
    runtime: "dotnet6",
  });
  yield func({
    id: "rust_func",
    stage: STAGE_LOCAL,
    handler: "packages/others/rust.handler",
    size: 204123,
    runtime: "rust",
  });
  yield func({
    stage: STAGE_LOCAL,
    id: "container_func",
    handler: "packages/others/container.handler",
    size: 204123,
    runtime: "container",
  });
  yield func({
    id: "other_func",
    stage: STAGE_LOCAL,
    handler: "packages/others/func.handler",
    size: 2048000,
  });
  yield func({
    id: "nextjs_func",
    stage: STAGE_LOCAL,
    arn: FUNC_ARN_NEXTJS,
    handler: "server.handler",
  });
  yield func({
    id: "ssr_func",
    stage: STAGE_LOCAL,
    arn: FUNC_ARN_SSR,
    handler: "server.handler",
  });

  yield resource({
    type: "Stack",
    id: STACK,
    stage: STAGE_LOCAL,
    enrichment: {
      version: "2.19.2",
      outputs: [
        {
          OutputKey: "EmptyOutput",
          OutputValue: "",
        },
        {
          OutputKey: "ApiEndpoint",
          OutputValue: "https://api.jayair.dev.sst.dev",
        },
        {
          OutputKey: "LongApiEndpoint",
          OutputValue:
            "https://long-auto-generated-cloudfront-aws-url-that-should-overflow-because-its-too-long-and-keeps-going-long-auto-generated-cloudfront-aws-url-that-should-overflow-because-its-too-long-and-keeps-going.com",
        },
        {
          OutputKey:
            "LongOutputThatShouldOverflowBecauseItsTooLongAndKeepsGoingThatShouldOverflowBecauseItsTooLongAndKeepsGoingThatShouldOverflowBecauseItsTooLongAndKeepsGoing",
          OutputValue:
            "https://long-auto-generated-cloudfront-aws-url-that-should-overflow-because-its-too-long-and-keeps-going-long-auto-generated-cloudfront-aws-url-that-should-overflow-because-its-too-long-and-keeps-going.com",
        },
      ],
    },
  });
  yield resource({
    type: "Api",
    id: "api",
    stage: STAGE_LOCAL,
    metadata: {
      url: "https://example.com",
      routes: [
        {
          route: "GET /todo",
          type: "function",
          fn: ref("index", STACK),
        },
        {
          route: "GET /notes",
          type: "function",
          fn: ref("notes_get", STACK),
        },
        {
          route: "PUT /notes",
          type: "function",
          fn: ref("notes_get", STACK),
        },
        {
          route: "UPDATE /notes",
          type: "function",
          fn: ref("notes_get", STACK),
        },
        {
          route: "PATCH /notes",
          type: "function",
          fn: ref("notes_get", STACK),
        },
        {
          route: "PATCH .",
          type: "function",
          fn: ref("notes_get", STACK),
        },
        {
          route:
            "POST /with/an/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long",
          type: "function",
          fn: ref("notes_post", STACK),
        },
      ],
      graphql: false,
      httpApiId: "someapi",
      customDomainUrl: "https://example.com",
    },
  });
  yield resource({
    type: "Api",
    id: "long-api",
    stage: STAGE_LOCAL,
    metadata: {
      url: "https://long-auto-generated-cloudfront-aws-url-that-should-overflow-because-its-too-long-and-keeps-going-long-auto-generated-cloudfront-aws-url-that-should-overflow-because-its-too-long-and-keeps-going.com",
      routes: [
        {
          route: "GET /",
          type: "function",
          fn: ref("index", STACK),
        },
      ],
      graphql: false,
      httpApiId: "someapi",
      customDomainUrl: undefined,
    },
  });
  yield resource({
    type: "ApiGatewayV1Api",
    id: "apiv1-api",
    stage: STAGE_LOCAL,
    metadata: {
      url: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com/jayair/",
      routes: [
        {
          fn: ref("index", STACK),
          type: "function",
          route: "ANY /{proxy+}",
        },
      ],
      restApiId: "someapi",
      customDomainUrl: undefined,
    },
  });
  yield resource({
    type: "Api",
    id: "no-routes",
    stage: STAGE_LOCAL,
    metadata: {
      url: "https://api.com",
      routes: [],
      graphql: false,
      httpApiId: "someapi",
      customDomainUrl: undefined,
    },
  });
  yield resource({
    type: "Cron",
    id: "cronjob",
    stage: STAGE_LOCAL,
    metadata: {
      job: ref("index", STACK),
      ruleName: "jayair-console-Dummy-cronjobRuleFEA4C4A4-1P314X49EP7CP",
      schedule: "rate(1 day)",
    },
  });
  yield resource({
    type: "Bucket",
    id: "uploads",
    stage: STAGE_LOCAL,
    metadata: {
      name: "jayair-console-dummy-uploadsbucket10132eb4-jypzgdnipek",
      notifications: [ref("index", STACK)],
      notificationNames: ["myNotification"],
    },
  });
  yield resource({
    type: "EventBus",
    id: "event-bus",
    stage: STAGE_LOCAL,
    metadata: {
      eventBusName: "event-bus",
      rules: [
        {
          key: "rule-1",
          targets: [ref("index", STACK)],
          targetNames: ["app_stage_connected_1_rule"],
        },
      ],
    },
  });
  yield resource({
    type: "StaticSite",
    id: "web",
    stage: STAGE_LOCAL,
    metadata: {
      path: "./packages/web/workspace",
      customDomainUrl: undefined,
      environment: {},
      url: "https://long-auto-generated-cloudfront-aws-url-that-should-overflow-because-its-too-long-and-keeps-going-long-auto-generated-cloudfront-aws-url-that-should-overflow-because-its-too-long-and-keeps-going.com",
    },
  });
  yield resource({
    type: "NextjsSite",
    id: "nextjs-site-local-no-custom-domain",
    stage: STAGE_LOCAL,
    metadata: {
      routes: {
        logGroupPrefix: "",
        data: [
          {
            route: "/ssr",
            logGroupPath: "",
          },
          {
            route: "/_next/data/BUILD_ID/isr.json",
            logGroupPath: "",
          },
          {
            route: "/api/auth/[...nextauth]",
            logGroupPath: "",
          },
          {
            route: "/",
            logGroupPath: "",
          },
          {
            route: "/_next/data/BUILD_ID/index.json",
            logGroupPath: "",
          },
        ],
      },
      customDomainUrl: undefined,
      server: FUNC_ARN_NEXTJS,
      path: "./packages/nextjs-site",
      edge: false,
      mode: "deployed",
      secrets: [],
      url: "",
      runtime: "nodejs18.x",
    },
  });
  yield resource({
    type: "NextjsSite",
    id: "nextjs-site",
    stage: STAGE_LOCAL,
    metadata: {
      customDomainUrl: "https://nextjs-site.com",
      routes: undefined,
      server: FUNC_ARN_NEXTJS,
      path: "packages/nextjs-site",
      edge: false,
      mode: "deployed",
      secrets: [],
      url: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com",
      runtime: "nodejs18.x",
    },
  });
  yield resource({
    type: "SvelteKitSite",
    id: "svelte-site",
    stage: STAGE_LOCAL,
    metadata: {
      customDomainUrl: "https://svelte-site.com",
      server: "arn:aws:lambda:us-east-1:123456789012:function:my-func",
      path: "packages/svelte-site",
      edge: false,
      mode: "deployed",
      secrets: [],
      url: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com",
      runtime: "nodejs18.x",
    },
  });
  yield resource({
    type: "RemixSite",
    id: "remix-site",
    stage: STAGE_LOCAL,
    metadata: {
      customDomainUrl: "https://remix-site.com",
      server: FUNC_ARN_SSR,
      path: "packages/remix-site",
      edge: false,
      mode: "deployed",
      secrets: [],
      url: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com",
      runtime: "nodejs18.x",
    },
  });
  yield resource({
    type: "AstroSite",
    id: "astro-site",
    stage: STAGE_LOCAL,
    metadata: {
      customDomainUrl: "https://astro-site.com",
      server: FUNC_ARN_SSR,
      path: "packages/astro-site",
      edge: false,
      mode: "deployed",
      secrets: [],
      url: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com",
      runtime: "nodejs18.x",
    },
  });
  yield resource({
    type: "SolidStartSite",
    id: "solid-site",
    stage: STAGE_LOCAL,
    metadata: {
      customDomainUrl: "https://solid-site.com",
      server: FUNC_ARN_SSR,
      path: "packages/solid-site",
      edge: false,
      mode: "deployed",
      secrets: [],
      url: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com",
      runtime: "nodejs18.x",
    },
  });
  yield resource({
    type: "Cognito",
    id: "cognito-auth",
    stage: STAGE_LOCAL,
    metadata: {
      identityPoolId: "someid",
      userPoolId: "someid",
      triggers: [
        {
          fn: ref("index", STACK),
          name: "consumer1",
        },
      ],
    },
  });
  yield resource({
    type: "Table",
    id: "notes-table",
    stage: STAGE_LOCAL,
    metadata: {
      consumers: [
        {
          fn: ref("index", STACK),
          name: "consumer1",
        },
      ],
      tableName: "jayair-console-dummy-notes-table",
    },
  });
  yield resource({
    type: "Queue",
    id: "my-queue",
    stage: STAGE_LOCAL,
    metadata: {
      name: "jayair-console-my-queue",
      url: "https://sqs.us-east-1.amazonaws.com/917397401067/jayair-console-my-queue",
      consumer: ref("index", STACK),
    },
  });
  yield resource({
    type: "KinesisStream",
    id: "my-stream",
    stage: STAGE_LOCAL,
    metadata: {
      consumers: [
        {
          fn: ref("index", STACK),
          name: "consumer1",
        },
      ],
      streamName: "jayair-console-my-stream",
    },
  }),
    yield resource({
      type: "Topic",
      id: "my-topic",
      stage: STAGE_LOCAL,
      metadata: {
        topicArn: "arn:aws:sns:us-east-1:917397401067:jayair-console-my-topic",
        subscribers: [ref("index", STACK)],
        subscriberNames: ["subscriber1"],
      },
    });
  yield resource({
    type: "Script",
    id: "my-script",
    stage: STAGE_LOCAL,
    metadata: {
      createfn: ref("index", STACK),
      deletefn: ref("index", STACK),
      updatefn: ref("index", STACK),
    },
  });
  yield resource({
    type: "AppSync",
    id: "appsync-api",
    stage: STAGE_LOCAL,
    metadata: {
      dataSources: [
        {
          fn: ref("index", STACK),
          name: "notesDs",
        },
      ],
      customDomainUrl: undefined,
      url: "https://3ec3bjoisfaxhgsubrayz5z3fa.appsync-api.us-east-1.amazonaws.com/graphql",
      appSyncApiId: "lz26zxwynve2dopyjdd2ekve34",
      appSyncApiKey: "da2-g63kqnmio5eyhbbv4dz6fk2x4y",
    },
  });
  yield resource({
    type: "WebSocketApi",
    id: "ws-api",
    stage: STAGE_LOCAL,
    metadata: {
      url: "wss://h7waex57g8.execute-api.us-east-1.amazonaws.com/jayair",
      routes: [
        {
          route: "$connect",
          fn: ref("index", STACK),
        },
        {
          route: "$default",
          fn: ref("index", STACK),
        },
        {
          route: "$disconnect",
          fn: ref("index", STACK),
        },
        {
          route: "$sendMessage",
          fn: ref("index", STACK),
        },
      ],
      customDomainUrl: undefined,
      httpApiId: "someapi",
    },
  });
  yield resource({
    type: "WebSocketApi",
    id: "ws-api-custom-domain",
    stage: STAGE_LOCAL,
    metadata: {
      url: "wss://h7waex57g8.execute-api.us-east-1.amazonaws.com/jayair",
      routes: [
        {
          route: "$connect",
          fn: ref("index", STACK),
        },
      ],
      customDomainUrl: "ws://api.sst.dev",
      httpApiId: "someapi",
    },
  }),
    yield resource({
      type: "RDS",
      id: "my-rds",
      stage: STAGE_LOCAL,
      metadata: {
        engine: "postgresql11.13",
        secretArn: "arn",
        clusterArn: "arn",
        clusterIdentifier: "jayair-console-my-rds",
        defaultDatabaseName: "acme",
        types: undefined,
        migrator: undefined,
      },
    });
}

function* resourcesNotSupported(): Generator<DummyData, void, unknown> {
  yield resource({
    type: "Stack",
    id: "stack",
    stage: STAGE_NOT_SUPPORTED,
    enrichment: {
      version: "1.0.0",
      outputs: [],
    },
  });
}

function* resourcesPartlySupported(): Generator<DummyData, void, unknown> {
  const STACK_WORKING = "stackB";
  const FN_NODE = "index";

  yield resource({
    type: "Stack",
    id: "stackA",
    stage: STAGE_PARTLY_SUPPORTED,
    enrichment: {
      version: "1.0.0",
      outputs: [],
    },
  });
  yield resource({
    type: "Stack",
    id: STACK_WORKING,
    stage: STAGE_PARTLY_SUPPORTED,
    enrichment: {
      version: "2.19.2",
      outputs: [],
    },
  });
  yield resource({
    type: "Table",
    id: "notes-table",
    stage: STAGE_PARTLY_SUPPORTED,
    metadata: {
      consumers: [
        {
          fn: {
            node: FN_NODE,
            stack: STACK_WORKING,
          },
          name: "consumer1",
        },
      ],
      tableName: "jayair-console-dummy-notes-table",
    },
  });
  yield func({
    id: FN_NODE,
    stage: STAGE_PARTLY_SUPPORTED,
    handler: "packages/function.handler",
  });
}
