import { DateTime } from "luxon";
import { AWS } from "@console/core/aws";
import { User } from "@console/core/user";
import { Issue } from "@console/core/issue";
import { Info } from "@console/core/warning";
import { App, Stage } from "@console/core/app";
import { StackFrame } from "@console/core/log";
import { Warning } from "@console/core/warning";
import type { Usage } from "@console/core/billing";
import { Workspace } from "@console/core/workspace";
import { Resource } from "@console/core/app/resource";

const USER_ID = "me@example.com";

const APP_ID = "1";
const APP_ID_LONG = "2";
const APP_LOCAL = "my-sst-app";

const STAGE = "stage-base";
const STAGE_LOCAL = "local";
const STAGE_EMPTY = "stage-empty";
const STAGE_NOT_SUPPORTED = "stage-not-supported";
const STAGE_PARTLY_SUPPORTED = "stage-partly-supported";
const STAGE_NO_ISSUES = "stage-no-issues";
const STAGE_HAS_ISSUES = "stage-has-issues";
const STAGE_ISSUES_WARN_RATE = "stage-issues-warning-rate-limit";
const STAGE_ISSUES_WARN_SUB = "stage-issues-warning-subscription";

const ACCOUNT_ID = "connected";
const ACCOUNT_ID_FULL = "full";
const ACCOUNT_ID_FAILED = "failed";
const ACCOUNT_ID_LONG_APPS = "long";
const ACCOUNT_ID_SYNCING = "syncing";
const ACCOUNT_ID_SYNCING_FULL = "syncing-full";

const FUNC_ARN_SSR = "arn:aws:lambda:us-east-1:123456789012:function:my-func";
const FUNC_ARN_NEXTJS = "arn:aws:lambda:us-east-1:123456789012:function:nextjs";

const ISSUE_WARN_FN = "my-warn-func";
const ISSUE_WARN_FN_LONG = "my-warn-func-long";

const ISSUE_ID = "123";
const ISSUE_FN = "my-issues-func";
const ISSUE_ID_LONG = "124";
const ISSUE_FN_NAME = "my-issues-func-long";
const ISSUE_ID_NO_STACK_TRACE = "125";
const ISSUE_ID_RAW_STACK_TRACE = "126";
const ISSUE_ID_FULL_STACK_TRACE = "127";

let WARNING_COUNT = 0;

const timestamps = {
  timeCreated: DateTime.now().startOf("day").toSQL()!,
  timeUpdated: DateTime.now().startOf("day").toSQL()!,
};

export type DummyMode =
  | "empty"
  | "overview:base;resource:base;issues:base"
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
  | (Omit<Issue.Count, "workspaceID"> & { _type: "issueCount" })
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
    ...timestamps,
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

interface IssueProps {
  id: string;
  error: string;
  stage?: string;
  fnName?: string;
  message: string;
  stack?: StackFrame[];
}
function issue({
  id,
  error,
  stage,
  fnName,
  message,
  stack,
}: IssueProps): DummyData {
  return {
    _type: "issue",
    id,
    timeSeen: DateTime.now().startOf("day").toSQL()!,
    timeDeleted: null,
    timeResolved: null,
    timeIgnored: null,
    stageID: stage || STAGE_HAS_ISSUES,
    error,
    message,
    count: 1,
    errorID: id,
    group: id,
    ignorer: null,
    resolver: null,
    stack: stack || null,
    pointer: {
      logGroup: `/aws/lambda/${fnName || ISSUE_FN}`,
      logStream: "2021/01/01/[$LATEST]12345678901234567890123456789012",
      timestamp: Date.now(),
    },
    ...timestamps,
  };
}

interface IssueCountProps {
  group: string;
  hour?: string;
  count?: number;
}
function issueCount({ group, hour, count }: IssueCountProps): DummyData {
  hour = hour || DateTime.now().startOf("hour").toSQL()!;
  return {
    _type: "issueCount",
    id: `${group}-${hour}`,
    hour,
    group,
    count: count || 1,
    stageID: STAGE_HAS_ISSUES,
    timeDeleted: null,
    ...timestamps,
  };
}

interface WarningProps {
  stage: string;
  target?: string;
  type: Warning.Info["type"];
  data?: Warning.Info["data"];
}
function warning({ type, stage, target, data }: WarningProps): DummyData {
  return {
    _type: "warning",
    type,
    stageID: stage,
    timeDeleted: null,
    id: `${WARNING_COUNT++}`,
    data: data || {},
    target: target || "",
    ...timestamps,
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
    yield* stageBase();
    yield* stageEmpty();
    yield* stageNotSupported();
    yield* stagePartlySupported();
  }

  if (modeMap["issues"]) {
    yield* stageNoIssues();
    yield* stageIssuesWarningSubscription();
    yield* stageIssuesWarningRateLimited();
    yield* stageHasIssues();
    yield* issueBase();
    yield* issueRawStackTrace();
    yield* issueFullSourceMapStackTrace();
    yield* issueNoStackTrace();
    yield* issueLong();
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

function* stageBase(): Generator<DummyData, void, unknown> {
  const STACK = "stack";

  yield stage({
    id: STAGE,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });

  yield func({
    id: "index",
    stage: STAGE,
    handler: "packages/function.handler",
  });
  yield func({
    id: "notes_get",
    stage: STAGE,
    handler: "packages/notes.handler",
    size: 20400800000,
  });
  yield func({
    id: "notes_post",
    stage: STAGE,
    handler: "packages/notes.handler",
    size: 2048000,
  });
  yield func({
    id: "go_func",
    stage: STAGE,
    handler: "packages/others/go.handler",
    size: 204123,
    runtime: "go1.x",
  });
  yield func({
    id: "java_func",
    stage: STAGE,
    handler: "packages/others/java.handler",
    size: 204123,
    runtime: "java17",
  });
  yield func({
    id: "node_func",
    stage: STAGE,
    handler: "packages/others/node.handler",
    size: 204123,
    runtime: "nodejs18.x",
  });
  yield func({
    id: "python_func",
    stage: STAGE,
    handler: "packages/others/python.handler",
    size: 204123,
    runtime: "python3.10",
  });
  yield func({
    id: "dotnet_func",
    stage: STAGE,
    handler: "packages/others/dotnet.handler",
    size: 204123,
    runtime: "dotnet6",
  });
  yield func({
    id: "rust_func",
    stage: STAGE,
    handler: "packages/others/rust.handler",
    size: 204123,
    runtime: "rust",
  });
  yield func({
    stage: STAGE,
    id: "container_func",
    handler: "packages/others/container.handler",
    size: 204123,
    runtime: "container",
  });
  yield func({
    id: "other_func",
    stage: STAGE,
    handler: "packages/others/func.handler",
    size: 2048000,
  });
  yield func({
    id: "nextjs_func",
    stage: STAGE,
    arn: FUNC_ARN_NEXTJS,
    handler: "server.handler",
  });
  yield func({
    id: "ssr_func",
    stage: STAGE,
    arn: FUNC_ARN_SSR,
    handler: "server.handler",
  });

  yield resource({
    type: "Stack",
    id: STACK,
    stage: STAGE,
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
    stage: STAGE,
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
    stage: STAGE,
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
    stage: STAGE,
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
    stage: STAGE,
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
    stage: STAGE,
    metadata: {
      job: ref("index", STACK),
      ruleName: "jayair-console-Dummy-cronjobRuleFEA4C4A4-1P314X49EP7CP",
      schedule: "rate(1 day)",
    },
  });
  yield resource({
    type: "Bucket",
    id: "uploads",
    stage: STAGE,
    metadata: {
      name: "jayair-console-dummy-uploadsbucket10132eb4-jypzgdnipek",
      notifications: [ref("index", STACK)],
      notificationNames: ["myNotification"],
    },
  });
  yield resource({
    type: "EventBus",
    id: "event-bus",
    stage: STAGE,
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
    stage: STAGE,
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
    stage: STAGE,
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
    stage: STAGE,
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
    stage: STAGE,
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
    stage: STAGE,
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
    stage: STAGE,
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
    stage: STAGE,
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
    stage: STAGE,
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
    stage: STAGE,
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
    stage: STAGE,
    metadata: {
      name: "jayair-console-my-queue",
      url: "https://sqs.us-east-1.amazonaws.com/917397401067/jayair-console-my-queue",
      consumer: ref("index", STACK),
    },
  });
  yield resource({
    type: "KinesisStream",
    id: "my-stream",
    stage: STAGE,
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
      stage: STAGE,
      metadata: {
        topicArn: "arn:aws:sns:us-east-1:917397401067:jayair-console-my-topic",
        subscribers: [ref("index", STACK)],
        subscriberNames: ["subscriber1"],
      },
    });
  yield resource({
    type: "Script",
    id: "my-script",
    stage: STAGE,
    metadata: {
      createfn: ref("index", STACK),
      deletefn: ref("index", STACK),
      updatefn: ref("index", STACK),
    },
  });
  yield resource({
    type: "AppSync",
    id: "appsync-api",
    stage: STAGE,
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
    stage: STAGE,
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
    stage: STAGE,
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
      stage: STAGE,
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

function* stageEmpty(): Generator<DummyData, void, unknown> {
  yield stage({
    id: STAGE_EMPTY,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
}

function* stageNotSupported(): Generator<DummyData, void, unknown> {
  yield stage({
    id: STAGE_NOT_SUPPORTED,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
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

function* stagePartlySupported(): Generator<DummyData, void, unknown> {
  const STACK_WORKING = "stackB";
  const FN_NODE = "index";

  yield stage({
    id: STAGE_PARTLY_SUPPORTED,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });

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

function* stageNoIssues(): Generator<DummyData, void, unknown> {
  yield stage({
    id: STAGE_NO_ISSUES,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
  yield resource({
    type: "Stack",
    id: "stackA",
    stage: STAGE_NO_ISSUES,
    enrichment: {
      version: "2.19.2",
      outputs: [],
    },
  });
  yield resource({
    type: "Table",
    id: "notes-table",
    stage: STAGE_NO_ISSUES,
    metadata: {
      consumers: [],
      tableName: "jayair-console-dummy-notes-table",
    },
  });
}

function* stageIssuesWarningRateLimited(): Generator<DummyData, void, unknown> {
  yield stage({
    id: STAGE_ISSUES_WARN_RATE,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
  yield resource({
    type: "Stack",
    id: "stackA",
    stage: STAGE_ISSUES_WARN_RATE,
    enrichment: {
      version: "2.19.2",
      outputs: [],
    },
  });
  yield func({
    id: ISSUE_WARN_FN,
    stage: STAGE_ISSUES_WARN_RATE,
    handler: "packages/function.handler",
  });
  yield warning({
    stage: STAGE_ISSUES_WARN_RATE,
    type: "issue_rate_limited",
  });
}

function* stageIssuesWarningSubscription(): Generator<
  DummyData,
  void,
  unknown
> {
  yield stage({
    id: STAGE_ISSUES_WARN_SUB,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
  yield resource({
    type: "Stack",
    id: "stackA",
    stage: STAGE_ISSUES_WARN_SUB,
    enrichment: {
      version: "2.19.2",
      outputs: [],
    },
  });
  yield func({
    id: ISSUE_WARN_FN,
    stage: STAGE_ISSUES_WARN_SUB,
    handler: "packages/function.handler",
  });
  yield func({
    id: ISSUE_WARN_FN_LONG,
    stage: STAGE_ISSUES_WARN_SUB,
    handler:
      "packages/path/of/a/really/long/function/name/that/should/overflow/because/it/is/way/too/long/and/it/keeps/going/and/going/and/lets/make/it/longer/just/for/fun/function.handler",
  });

  yield warning({
    stage: STAGE_ISSUES_WARN_SUB,
    type: "log_subscription",
    data: {
      error: "unknown",
      message: "Some error message",
    },
    target: ISSUE_WARN_FN,
  });
  yield warning({
    stage: STAGE_ISSUES_WARN_SUB,
    type: "log_subscription",
    data: {
      error: "limited",
    },
    target: ISSUE_WARN_FN,
  });
  yield warning({
    stage: STAGE_ISSUES_WARN_SUB,
    type: "log_subscription",
    data: {
      error: "permissions",
    },
    target: ISSUE_WARN_FN,
  });
  yield warning({
    stage: STAGE_ISSUES_WARN_SUB,
    type: "log_subscription",
    data: {
      error: "noisy",
    },
    target: ISSUE_WARN_FN_LONG,
  });
}

function* stageHasIssues(): Generator<DummyData, void, unknown> {
  yield stage({
    id: STAGE_HAS_ISSUES,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
  yield resource({
    type: "Stack",
    id: "stackA",
    stage: STAGE_HAS_ISSUES,
    enrichment: {
      version: "2.19.2",
      outputs: [],
    },
  });
  yield resource({
    type: "Table",
    id: "notes-table",
    stage: STAGE_HAS_ISSUES,
    metadata: {
      consumers: [],
      tableName: "jayair-console-dummy-notes-table",
    },
  });
  yield func({
    id: ISSUE_FN,
    stage: STAGE_HAS_ISSUES,
    handler: "packages/function.handler",
    arn: `arn:aws:lambda:us-east-1:123456789012:function:${ISSUE_FN}`,
  });
}

function* issueBase(): Generator<DummyData, void, unknown> {
  yield issue({
    id: ISSUE_ID,
    error: "Error",
    message: "Some error message",
  });
  yield issueCount({
    group: ISSUE_ID,
  });
  yield issueCount({
    count: 4,
    group: ISSUE_ID,
    hour: DateTime.now().minus({ hour: 1 }).startOf("hour").toSQL()!,
  });
  yield issueCount({
    count: 2,
    group: ISSUE_ID,
    hour: DateTime.now().minus({ hour: 2 }).startOf("hour").toSQL()!,
  });
}

function* issueNoStackTrace(): Generator<DummyData, void, unknown> {
  yield issue({
    id: ISSUE_ID_NO_STACK_TRACE,
    error: "Error No Stack Trace",
    message: "Some error message",
  });
  yield issueCount({
    group: ISSUE_ID_NO_STACK_TRACE,
  });
}

function* issueRawStackTrace(): Generator<DummyData, void, unknown> {
  yield issue({
    id: ISSUE_ID_RAW_STACK_TRACE,
    error: "Error Raw Stack Trace",
    message: "Some error message",
    stack: [
      {
        raw: "at getServerSideProps (/var/task/.next/server/pages/ssr.js:98:11)",
      },
      {
        raw: "at /var/task/node_modules/.ppm/next@13.4.7_@babel+core@7.22.5_react-dom@18.2.0_react@18.2.0/node_modules/next/dist/server/render.js:569:26",
      },
      {
        raw: "at /var/task/node_modules/.ppm/next@13.4.7_@babel+core@7.22.5_react-dom@18.2.0_react@18.2.0/node_modules/next/dist/server/lib/trace/tracer.js:117:36",
      },
      {
        raw: "at NoopContextManager.with (/var/task/node_modules/.ppm/next@13.4.7_@babel+core@7.22.5_react-dom@18.2.0_react@18.2.0/node_modules/next/dist/compiled/@opentelemetry/api/index.js:1:7057)",
      },
      {
        raw: "at ContextAPI.with (/var/task/node_modules/.ppm/next@13.4.7_@babel+core@7.22.5_react-dom@18.2.0_react@18.2.0/node_modules/next/dist/compiled/@opentelemetry/api/index.js:1:516)",
      },
      // Don't render this as pre
      {
        raw: `at  

        ContextAPI.with

        (/var/task/node_modules/.ppm/next@13.4.7_@babel+core@7.22.5_react-dom@18.2.0_react@18.2.0/node_modules/next/dist/compiled/@opentelemetry/api/index.js:1:516)`,
      },
    ],
  });
  yield issueCount({
    group: ISSUE_ID_RAW_STACK_TRACE,
  });
}

function* issueFullSourceMapStackTrace(): Generator<DummyData, void, unknown> {
  yield issue({
    id: ISSUE_ID_FULL_STACK_TRACE,
    error: "Error Full Source Map Stack Trace",
    message: "Some error message",
    stack: [
      {
        column: 39,
        line: 5,
        file: "node_modules/.pnpm/@smithy+smithy-client@2.1.12/node_modules/@smithy/smithy-client/dist-es/default-error-handler.js",
        context: [
          `  export const throwDefaultError = ({ output, parsedBody, exceptionCtor, errorCode }) => {`,
          `    const $metadata = deserializeMetadata(output);`,
          `    const statusCode = $metadata.httpStatusCode ? $metadata.httpStatusCode + "" : undefined;`,
          `    const response = new exceptionCtor({`,
          `      name: parsedBody?.code || parsedBody?.Code || errorCode || statusCode || "UnknownError",`,
          `      $fault: "client",`,
          `      $metadata,`,
        ],
      },
      {
        column: 52,
        line: 5323,
        file: "node_modules/.pnpm/@aws-sdk+client-dynamodb@3.33.0/node_modules/@aws-sdk/client-dynamodb/dist-es/protocols/Aws_json1_0.ts",
        context: [
          `      Type: __expectString,`,
          `    });`,
          `    Object.assign(contents, doc);`,
          `    const exception = new ResourceNotFoundException({`,
          `      $metadata: deserializeMetadata(output),`,
          `      ...contents,`,
          `    });`,
        ],
      },
      {
        raw: "processTicksAndRejections (node:internal/process/task_queues:96:5)",
      },
      {
        column: 17,
        line: 24,
        file: "packages/core/src/lambda/index.ts",
        important: true,
        context: [
          `      const config = await Stage.assumeRole(input.stageID, input.extraParam, input.extraLongParamThatShouldOverflowBecauseItsTooLong);`,
          `      constclient=newDynamoDBClient(config).thatDoesNotHaveAnyLinebreaksAndItShouldFailToBreakBecauseItsTooLongAndThisShouldFailBecauseItKeepsGoingAndGoingFurtherAndFurtherToTest;`,
          `      const client = new LambdaClient(config);`,
          `      await client.send(`,
          `        new InvokeCommand({`,
          `          FunctionName: input.functionName,`,
          `          Payload: input.payload,`,
        ],
      },
      {
        column: 41,
        line: 99,
        important: true,
        file: "packages/functions/src/replicache/with/a/path/that/is/really/long/that/should/overflow/because/its/way/too/long/and/should/overflow/push1.ts",
        context: [
          `        const { args, name } = mutation;`,
          `        const { data } = await invokeLambda({`,
          `          functionName: name,`,
          `          payload: JSON.stringify(args),`,
          `        });`,
          `        return JSON.parse(data);`,
          `      }`,
        ],
      },
    ],
  });
  yield issueCount({
    group: ISSUE_ID_FULL_STACK_TRACE,
  });
}

function* issueLong(): Generator<DummyData, void, unknown> {
  yield func({
    id: ISSUE_FN_NAME,
    stage: STAGE_HAS_ISSUES,
    handler:
      "packages/path/to/function/that/should/overflow/because/its/too/long/and/it/keeps/going/because/it/really/is/way/too/long/function.handler",
    arn: `arn:aws:lambda:us-east-1:123456789012:function:${ISSUE_FN_NAME}`,
  });

  yield issue({
    id: ISSUE_ID_LONG,
    stage: STAGE_HAS_ISSUES,
    error:
      "Errorlongmessagethatisreallylongandshouldoverflowbecauseitstoolonganditkeepsgoingandgoingforareallylongtime",
    message:
      "Someerrormessagethat'salsowaytoolongandshouldoverflowbecauseitstoolonganditkeepsgoingandgoingforareallylongtime",
    fnName: ISSUE_FN_NAME,
  });
  yield issueCount({
    group: ISSUE_ID_LONG,
  });
}
