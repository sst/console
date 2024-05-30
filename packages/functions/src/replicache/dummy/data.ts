import { DateTime } from "luxon";
import { createHash } from "crypto";
import { AWS } from "@console/core/aws";
import { User } from "@console/core/user";
import { Issue } from "@console/core/issue";
import { State } from "@console/core/state";
import { App, Stage } from "@console/core/app";
import { Warning } from "@console/core/warning";
import { Workspace } from "@console/core/workspace";
import { Resource } from "@console/core/app/resource";
import { Usage, Billing } from "@console/core/billing";
import { StackFrame, ParsedError, Invocation } from "@console/core/log";

export type DummyMode =
  // Waiting to connect
  | "empty"
  // Default
  | "overview:base"
  // Overview
  | "overview:full"
  // Logs
  | "overview:base;logs:base"
  // Issues
  | "overview:base;issues:base"
  // Alerts
  | "overview:base;alerts:base"
  // Updates
  | "overview:base;updates:base"
  // Resources
  | "overview:base;resources:base"
  // With billing details
  | "overview:base;usage:overage;subscription:active"
  // Ask for billing details
  | "overview:base;usage:overage;resources:base;workspace:gated"
  // Failed to charge card
  | "overview:base;usage:overage;resources:base;workspace:gated;subscription:overdue";

export function* generateData(
  mode: DummyMode
): Generator<DummyData, void, unknown> {
  console.log("generating for", mode);

  // Reset auto-incrementing IDs
  UPDATE_ID = 0;
  STATE_RES_ID = 0;
  WARNING_COUNT = 0;
  INVOCATION_COUNT = 0;
  ISSUE_ALERT_COUNT = 0;

  const modeMap = stringToObject(mode);

  yield workspace({
    id: "dummy-workspace",
    gated: modeMap["workspace"] === "gated",
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

  if (modeMap["overview"]) {
    yield* workspaceBase();
    yield* stageLocal();

    yield usage({ day: "2021-01-01", invocations: 100 });
  }

  if (modeMap["overview"] === "full") {
    for (let i = 0; i < 30; i++) {
      yield user({ email: `dummy${i}@example.com`, active: true });
    }

    yield* overviewFull();
  }

  if (modeMap["subscription"]) {
    yield stripe({
      standing: modeMap["subscription"] === "overdue" ? "overdue" : undefined,
    });
  }

  if (modeMap["usage"] === "overage")
    yield usage({ day: "2021-01-01", invocations: 12300099000 });

  if (modeMap["updates"]) {
    yield* stageBase();
    yield* updatesBase();
  }

  if (modeMap["resources"]) {
    yield* stageBase();
    yield* stageIonBase();
    yield* stageEmpty();
    yield* stageIonEmpty();
    yield* stageNotSupported();
  }

  if (modeMap["issues"]) {
    yield* stageNoIssues();
    yield* stageNoActiveIssues();
    yield* stageIssuesWarningMixed();
    yield* stageIssuesWarningRateLimited();
    yield* stageIssuesWarningSubscription();
    yield* stageHasIssues();

    yield* issueBase();
    yield* issueRawStackTrace();
    yield* issueFullSourceMapStackTrace();
    yield* issueNoStackTrace();
    yield* issueLong();
    yield* issueMissingSourcemap();
  }

  if (modeMap["alerts"] === "base") {
    yield* issueAlertsStar();
    yield* issueAlertsSingle();
    yield* issueAlertsSingleTo();
    yield* issueAlertsDoubleTo();
    yield* issueAlertsDoubleFrom();
    yield* issueAlertsMultipleTo();
    yield* issueAlertsOverflowTo();
    yield* issueAlertsSlackWarning();
    yield* issueAlertsOverflowFrom();
    yield* issueAlertsMultipleFrom();
  }

  if (modeMap["logs"]) {
    yield* stageHasFunction();

    yield* invocationBase();
    yield* invocationEmpty();
    yield* invocationNoLog();
    yield* invocationColdStart();
    yield* invocationIncomplete();
    yield* invocationOverflowMessage();
    yield* invocationWithRequestResponse();

    yield* invocationErrorSimple();
    yield* invocationErrorMessageOverflow();
    yield* invocationFailSimple();
    yield* invocationFailSimpleNoLog();
    yield* invocationFailMultiple();
    yield* invocationErrorStackTraceBase();
    yield* invocationFailMultipleWithStackTrace();
    yield* invocationErrorStackTraceRaw();
    yield* invocationErrorStackTraceFull();
  }
}

type DummyData =
  | (DummyConfig & { _type: "dummyConfig" })
  | (Workspace.Info & { _type: "workspace" })
  | (State.Update & { _type: "stateUpdate" })
  | (State.ResourceEvent & { _type: "stateEvent" })
  | (Omit<Usage, "workspaceID"> & { _type: "usage" })
  | (Omit<App.Info, "workspaceID"> & { _type: "app" })
  | (Omit<User.Info, "workspaceID"> & { _type: "user" })
  | (Omit<Stage.Info, "workspaceID"> & { _type: "stage" })
  | (Omit<Issue.Info, "workspaceID"> & { _type: "issue" })
  | (Omit<Warning.Info, "workspaceID"> & { _type: "warning" })
  | (Omit<Invocation, "workspaceID"> & { _type: "invocation" })
  | (Omit<Issue.Count, "workspaceID"> & { _type: "issueCount" })
  | (Omit<Resource.Info, "workspaceID"> & { _type: "resource" })
  | (Omit<Billing.Stripe.Info, "workspaceID"> & { _type: "stripe" })
  | (Omit<Issue.Alert.Info, "workspaceID"> & { _type: "issueAlert" })
  | (Omit<AWS.Account.Info, "workspaceID"> & { _type: "awsAccount" });

const USER_ID = "me@example.com";
const USER_ID_ISSUE_ALERT = "alert-me@example.com";
const USER_ID_ISSUE_1 = "issue-alert_1@example.com";
const USER_ID_ISSUE_2 = "issue-alert_2@example.com";
const USER_ID_ISSUE_3 = "issue-alert_3@example.com";
const USER_ID_ISSUE_4 = "issue-alert_4@example.com";
const USER_ID_ISSUE_5 = "issue-alert_5@example.com";
const USER_ID_ISSUE_6 = "issue-alert_6@example.com";
const USER_ID_ISSUE_7 = "issue-alert_7@example.com";
const USER_ID_ISSUE_8 = "issue-alert_8@example.com";
const USER_ID_ISSUE_9 = "issue-alert_9@example.com";

const APP_ID = "1";
const APP_ID_LONG = "2";
const APP_LOCAL = "my-sst-app";
const APP_ISSUE_1 = "sst-app-issue-1";
const APP_ISSUE_2 = "sst-app-issue-2";
const APP_ISSUE_3 = "sst-app-issue-3";
const APP_ISSUE_4 = "sst-app-issue-4";
const APP_ISSUE_5 = "sst-app-issue-5";
const APP_ISSUE_6 = "sst-app-issue-6";
const APP_ISSUE_7 = "sst-app-issue-7";
const APP_ISSUE_8 = "sst-app-issue-8";
const APP_ISSUE_9 = "sst-app-issue-9";
const APP_ISSUE_ALERT_LONG =
  "mysstappissealertlongshouldoverflowbecaseitistoolongandshouldnotfitintheboxbecauseitstoolonganditkeepsgoingandgoing";

const STACK = "stack-base";
const STACK_LOCAL = "stack-local";
const STACK_WORKING = "stack-working";

const STAGE = "stage-base";
const STAGE_LOCAL = "local";
const STAGE_ION = "ion";
const STAGE_EMPTY = "stage-empty";
const STAGE_ION_EMPTY = "ion-empty";
const STAGE_NOT_SUPPORTED = "stage-not-supported";
const STAGE_PARTLY_SUPPORTED = "stage-partly-supported";
const STAGE_NO_ISSUES = "stage-no-issues";
const STAGE_NO_ACTIVE_ISSUES = "stage-no-active-issues";
const STAGE_HAS_ISSUES = "stage-has-issues";
const STAGE_HAS_FUNCTION = "stage-has-function";
const STAGE_ISSUES_WARN_MIXED = "stage-issues-warning-mixed";
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
const ISSUE_WARN_FN_ARN =
  "arn:aws:lambda:us-east-1:123456789012:function:my-warn-func";
const ISSUE_WARN_FN_LONG = "my-warn-func-long";
const ISSUE_WARN_FN_LONG_ARN =
  "arn:aws:lambda:us-east-1:123456789012:function:my-warn-func-long";

const ISSUE_ID = "123";
const ISSUE_FN = "my-issues-func";
const ISSUE_ID_LONG = "124";
const ISSUE_FN_NAME_LONG = "my-issues-func-long";
const ISSUE_FN_NAME_MISSING_SOURCEMAP = "my-issues-func-missing-sourcemap";
const ISSUE_ID_NO_STACK_TRACE = "125";
const ISSUE_ID_RAW_STACK_TRACE = "126";
const ISSUE_ID_FULL_STACK_TRACE = "127";
const ISSUE_ID_MISSING_SOURCEMAP = "128";
const ISSUE_ID_RESOLVED = "129";
const ISSUE_ID_IGNORED = "130";

const STACK_TRACE = [
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
];
const STACK_TRACE_RAW = [
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
];

const STACK_TRACE_FULL = [
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
  {
    column: 17,
    line: 2,
    file: "packages/core/short/file/case.ts",
    important: true,
    context: [
      `      const { args, name } = mutation;`,
      `      const client = new LambdaClient(config);`,
      `      return JSON.parse(data);`,
    ],
  },
];

const LOGS_FN = "my-logs-func";

// Auto-incrementing IDs
let UPDATE_ID = 0;
let STATE_RES_ID = 0;
let WARNING_COUNT = 0;
let INVOCATION_COUNT = 0;
let ISSUE_ALERT_COUNT = 0;

const timestamps = {
  timeCreated: DateTime.now().startOf("day").toSQL()!,
  timeUpdated: DateTime.now().startOf("day").toSQL()!,
};

export interface DummyConfig {
  local: {
    app: string;
    stage: string;
  };
  user: string;
}

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

function* workspaceBase(): Generator<DummyData, void, unknown> {
  yield account({ id: ACCOUNT_ID, accountID: "123456789012" });
  yield app({ id: APP_LOCAL });
  yield stage({
    id: STAGE_LOCAL,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
}

function* overviewFull(): Generator<DummyData, void, unknown> {
  yield user({ email: "invited-dummy@example.com" });
  yield user({ email: "invited-dummy-with-long-email-address@example.com" });
  yield user({
    email: "deleted-dummy@example.com",
    active: true,
    deleted: true,
  });

  yield* overviewSortApps();
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

function* overviewSortApps(): Generator<DummyData, void, unknown> {
  yield stage({
    id: "b-supported-b",
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
  yield stage({
    id: "b-supported-a",
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
  yield stage({
    id: "a-unsupported-b",
    appID: APP_LOCAL,
    unsupported: true,
    awsAccountID: ACCOUNT_ID,
  });
  yield stage({
    id: "a-unsupported-a",
    appID: APP_LOCAL,
    unsupported: true,
    awsAccountID: ACCOUNT_ID,
  });
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

function* stageLocal(): Generator<DummyData, void, unknown> {
  yield resource({
    type: "Stack",
    id: STACK_LOCAL,
    stage: STAGE_LOCAL,
    enrichment: {
      version: "2.19.2",
      outputs: [],
    },
  });
  yield resource({
    type: "Table",
    id: "notes-table-local",
    stage: STAGE_LOCAL,
    metadata: {
      consumers: [],
      tableName: "jayair-console-dummy-notes-table",
    },
  });
}

function* stageIonBase(): Generator<DummyData, void, unknown> {
  yield stage({
    id: STAGE_ION,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
}

function* stageIonEmpty(): Generator<DummyData, void, unknown> {
  yield stage({
    id: STAGE_ION_EMPTY,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
}

function* stageBase(): Generator<DummyData, void, unknown> {
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
    id: "nextjs-site",
    stage: STAGE,
    metadata: {
      prefetchSecrets: false,
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
      path: "./packages/nextjs-site/that/is/a/very/long/path/that/should/overflow/because/its/way/too/long",
      edge: false,
      mode: "deployed",
      secrets: [],
      url: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com",
      runtime: "nodejs18.x",
    },
  });
  yield resource({
    type: "NextjsSite",
    id: "nextjs-site-combined-logging",
    stage: STAGE,
    metadata: {
      prefetchSecrets: false,
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
    type: "NextjsSite",
    id: "nextjs-site-local",
    stage: STAGE,
    metadata: {
      prefetchSecrets: false,
      routes: undefined,
      customDomainUrl: undefined,
      server: FUNC_ARN_NEXTJS,
      path: "./packages/nextjs-site/that/is/a/very/long/path/that/should/overflow/because/its/way/too/long",
      edge: false,
      mode: "placeholder",
      secrets: [],
      url: "",
      runtime: "nodejs18.x",
    },
  });
  yield resource({
    type: "SvelteKitSite",
    id: "svelte-site",
    stage: STAGE,
    metadata: {
      prefetchSecrets: false,
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
      prefetchSecrets: false,
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
      prefetchSecrets: false,
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
      prefetchSecrets: false,
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
          route: "$requestalleventprogress",
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
  });
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
      migrator: ref("index", STACK),
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
}

function* stageEmpty(): Generator<DummyData, void, unknown> {
  yield stage({
    id: STAGE_EMPTY,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
  yield resource({
    type: "Stack",
    id: "stackA",
    stage: STAGE_EMPTY,
    enrichment: {
      version: "1.0.0",
      outputs: [],
    },
  });
  yield resource({
    type: "Stack",
    id: STACK,
    stage: STAGE_EMPTY,
    enrichment: {
      version: "2.19.2",
      outputs: [
        {
          OutputKey: "EmptyOutput",
          OutputValue: "",
        },
      ],
    },
  });
}

function* stageNotSupported(): Generator<DummyData, void, unknown> {
  yield stage({
    appID: APP_LOCAL,
    unsupported: true,
    id: STAGE_NOT_SUPPORTED,
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

function* stageNoActiveIssues(): Generator<DummyData, void, unknown> {
  yield stage({
    id: STAGE_NO_ACTIVE_ISSUES,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
  yield resource({
    type: "Stack",
    id: "stackA",
    stage: STAGE_NO_ACTIVE_ISSUES,
    enrichment: {
      version: "2.19.2",
      outputs: [],
    },
  });
  yield resource({
    type: "Table",
    id: "notes-table",
    stage: STAGE_NO_ACTIVE_ISSUES,
    metadata: {
      consumers: [],
      tableName: "jayair-console-dummy-notes-table",
    },
  });
  yield issue({
    stage: STAGE_NO_ACTIVE_ISSUES,
    id: ISSUE_ID_RESOLVED,
    error: "Resolved Error",
    message: "Some error message",
    timeResolved: DateTime.now().startOf("day").toSQL()!,
  });
  yield issue({
    stage: STAGE_NO_ACTIVE_ISSUES,
    id: ISSUE_ID_IGNORED,
    error: "Ignored Error",
    message: "Some error message",
    timeIgnored: DateTime.now().startOf("day").toSQL()!,
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
    arn: ISSUE_WARN_FN_ARN,
    stage: STAGE_ISSUES_WARN_SUB,
    handler: "packages/function.handler",
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
      error: "unknown",
      message: "Some error message",
    },
    target: ISSUE_WARN_FN,
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
    arn: ISSUE_WARN_FN_ARN,
    stage: STAGE_ISSUES_WARN_RATE,
    handler: "packages/function.handler",
  });
  yield warning({
    stage: STAGE_ISSUES_WARN_RATE,
    type: "issue_rate_limited",
    target: ISSUE_WARN_FN,
  });
}

function* stageIssuesWarningMixed(): Generator<DummyData, void, unknown> {
  yield stage({
    id: STAGE_ISSUES_WARN_MIXED,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
  yield resource({
    type: "Stack",
    id: "stackA",
    stage: STAGE_ISSUES_WARN_MIXED,
    enrichment: {
      version: "2.19.2",
      outputs: [],
    },
  });
  yield func({
    id: ISSUE_WARN_FN,
    arn: ISSUE_WARN_FN_ARN,
    stage: STAGE_ISSUES_WARN_MIXED,
    handler: "packages/function.handler",
  });
  yield func({
    id: ISSUE_WARN_FN_LONG,
    arn: ISSUE_WARN_FN_LONG_ARN,
    stage: STAGE_ISSUES_WARN_MIXED,
    handler:
      "packages/path/of/a/really/long/function/name/that/should/overflow/because/it/is/way/too/long/and/it/keeps/going/and/going/and/lets/make/it/longer/just/for/fun/function.handler",
  });

  yield warning({
    stage: STAGE_ISSUES_WARN_MIXED,
    type: "issue_rate_limited",
    target: ISSUE_WARN_FN,
  });
  yield warning({
    stage: STAGE_ISSUES_WARN_MIXED,
    type: "log_subscription",
    data: {
      error: "unknown",
      message: "Some error message",
    },
    target: ISSUE_WARN_FN,
  });
  yield warning({
    stage: STAGE_ISSUES_WARN_MIXED,
    type: "log_subscription",
    data: {
      error: "unknown",
      message: "Some error message",
    },
    target: ISSUE_WARN_FN_LONG,
  });
  yield warning({
    stage: STAGE_ISSUES_WARN_MIXED,
    type: "log_subscription",
    data: {
      error: "unknown",
      message: "Some error message",
    },
    target: ISSUE_WARN_FN,
  });
  yield warning({
    stage: STAGE_ISSUES_WARN_MIXED,
    type: "log_subscription",
    data: {
      error: "unknown",
      message: "Some error message",
    },
    target: ISSUE_WARN_FN,
  });
  yield warning({
    stage: STAGE_ISSUES_WARN_MIXED,
    type: "log_subscription",
    data: {
      error: "unknown",
      message: "Some error message",
    },
    target: ISSUE_WARN_FN,
  });
  yield warning({
    stage: STAGE_ISSUES_WARN_MIXED,
    type: "log_subscription",
    data: {
      error: "unknown",
      message: "Some error message",
    },
    target: ISSUE_WARN_FN,
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

function* stageHasFunction(): Generator<DummyData, void, unknown> {
  yield stage({
    id: STAGE_HAS_FUNCTION,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID,
  });
  yield resource({
    type: "Stack",
    id: "stackA",
    stage: STAGE_HAS_FUNCTION,
    enrichment: {
      version: "2.19.2",
      outputs: [],
    },
  });
  yield func({
    id: LOGS_FN,
    stage: STAGE_HAS_FUNCTION,
    handler: "packages/function.handler",
    arn: `arn:aws:lambda:us-east-1:123456789012:function:${LOGS_FN}`,
  });
}

function* updatesBase(): Generator<DummyData, void, unknown> {
  yield update({
    id: ++UPDATE_ID,
    stage: STAGE,
    timeStarted: DateTime.now().minus({ minutes: 13 }).toISO()!,
    timeCompleted: DateTime.now().minus({ minutes: 11 }).toISO()!,
    created: 20,
  });
  yield update({
    id: ++UPDATE_ID,
    stage: STAGE,
    timeStarted: DateTime.now().minus({ minutes: 12 }).toISO()!,
    timeCompleted: DateTime.now().minus({ minutes: 10 }).toISO()!,
    created: 2,
    updated: 4,
    same: 14,
  });
  yield update({
    id: ++UPDATE_ID,
    stage: STAGE,
    timeStarted: DateTime.now().minus({ minutes: 11 }).toISO()!,
    timeCompleted: DateTime.now().minus({ minutes: 9 }).toISO()!,
    updated: 20,
  });
  yield update({
    id: ++UPDATE_ID,
    stage: STAGE,
    timeStarted: DateTime.now().minus({ minutes: 10 }).toISO()!,
    timeCompleted: DateTime.now().minus({ minutes: 8 }).toISO()!,
    deleted: 4,
    same: 16,
  });
  yield update({
    id: ++UPDATE_ID,
    stage: STAGE,
    timeStarted: DateTime.now().minus({ minutes: 9 }).toISO()!,
    timeCompleted: DateTime.now().minus({ minutes: 7 }).toISO()!,
    same: 20,
  });
  yield update({
    id: ++UPDATE_ID,
    stage: STAGE,
    command: "remove",
    timeStarted: DateTime.now().minus({ minutes: 8 }).toISO()!,
    timeCompleted: DateTime.now().minus({ minutes: 6 }).toISO()!,
    same: 20,
    created: 1,
    updated: 2,
    deleted: 3,
  });
  yield update({
    id: ++UPDATE_ID,
    stage: STAGE,
    errors: [
      {
        urn: "urn:pulumi:jayair::ion-sandbox::sst:aws:Function::FunctionA",
        message: `Invalid component name "FunctionA".\nComponent names must be unique.`,
      },
      {
        urn: "urn:pulumi:jayair::ion-sandbox::sst:aws:Function$pulumi-nodejs:dynamic:Resource::FunctionACodeUpdater.sst.aws.FunctionCodeUpdaterFunctionCodeUpdaterFunctionCodeUpdaterFunctionCodeUpdaterFunctionCodeUpdaterFunctionCodeUpdaterFunctionCodeUpdaterFunctionCodeUpdaterFunctionCodeUpdaterFunctionCodeUpdater",
        message: "Resource already exists.",
      },
      {
        urn: "",
        message: `Running program '/Users/jayair/Desktop/Sandbox/ion-sandbox/.sst/platform/eval/eval-1717000722399.mjs' failed with an unhandled exception:
<ref *1> Error: Failed to build function: Could not find file for handler "index1.handler"
    at file:///Users/jayair/Desktop/Sandbox/ion-sandbox/.sst/platform/src/components/aws/function.ts:1134:21 {
  promise: Promise { <rejected> [Circular *1] }
}`,
      },
    ],
    deleted: 1,
    timeStarted: DateTime.now().minus({ minutes: 7 }).toISO()!,
    timeCompleted: DateTime.now().minus({ minutes: 5 }).toISO()!,
  });
  yield* stateEventError();
  yield update({
    id: ++UPDATE_ID,
    stage: STAGE,
    errors: [
      {
        urn: "urn:pulumi:jayair::ion-sandbox::sst:aws:Function::FunctionC",
        message: `Running program '/Users/jayair/Desktop/Sandbox/ion-sandbox/.sst/platform/eval/eval-1717000722399.mjs' failed with an unhandled exception:
<ref *1> Error: Failed to build function: Could not find file for handler "index1.handler"
    at file:///Users/jayair/Desktop/Sandbox/ion-sandbox/.sst/platform/src/components/aws/function.ts:1134:21 {
  promise: Promise { <rejected> [Circular *1] }
}`,
      },
    ],
    command: "edit",
    timeStarted: DateTime.now().minus({ minutes: 5 }).toISO()!,
    timeCompleted: DateTime.now().minus({ minutes: 4 }).toISO()!,
  });
  yield update({
    id: ++UPDATE_ID,
    stage: STAGE,
    command: "refresh",
    same: 15,
    created: 2,
    updated: 4,
    deleted: 5,
    timeStarted: DateTime.now().minus({ minutes: 4 }).toISO()!,
    timeCompleted: DateTime.now().minus({ minutes: 3 }).toISO()!,
  });
  yield* stateEventBase();
  yield update({
    id: ++UPDATE_ID,
    stage: STAGE,
    timeStarted: DateTime.now().minus({ minutes: 2 }).toISO()!,
  });
}

function* stateEventBase(): Generator<DummyData, void, unknown> {
  yield stateEvent({
    id: ++STATE_RES_ID,
    stageID: STAGE,
    update: UPDATE_ID,
    type: "pulumi-nodejs:dynamic:Resource",
    urn: "urn:pulumi:jayair::ion-sandbox::sst:aws:Function$pulumi-nodejs:dynamic:Resource::FunctionACodeUpdater.sst.aws.FunctionCodeUpdater",
    action: "deleted",
  });
  yield stateEvent({
    id: ++STATE_RES_ID,
    stageID: STAGE,
    update: UPDATE_ID,
    type: "aws:lambda/function:Function",
    urn: "urn:pulumi:jayair::ion-sandbox::sst:aws:Function$aws:lambda/function:Function::FunctionAFunction",
    action: "deleted",
  });
  yield stateEvent({
    id: ++STATE_RES_ID,
    stageID: STAGE,
    update: UPDATE_ID,
    type: "sst:aws:Function",
    urn: "urn:pulumi:jayair::ion-sandbox::sst:aws:Function::FunctionC",
    action: "deleted",
  });
  yield stateEvent({
    id: ++STATE_RES_ID,
    stageID: STAGE,
    update: UPDATE_ID,
    type: "sst:aws:Function",
    urn: "urn:pulumi:jayair::ion-sandbox::sst:aws:Function::FunctionD",
    action: "deleted",
  });
  yield stateEvent({
    id: ++STATE_RES_ID,
    stageID: STAGE,
    update: UPDATE_ID,
    type: "sst:aws:Function",
    urn: "urn:pulumi:jayair::ion-sandbox::sst:aws:Function::FunctionE",
    action: "deleted",
  });
  yield stateEvent({
    id: ++STATE_RES_ID,
    stageID: STAGE,
    update: UPDATE_ID,
    type: "aws:cloudwatch/logGroup:LogGroup",
    urn: "urn:pulumi:jayair::ion-sandbox::sst:aws:Function$aws:cloudwatch/logGroup:LogGroup::FunctionALogGroup",
    action: "created",
  });
  yield stateEvent({
    id: ++STATE_RES_ID,
    stageID: STAGE,
    update: UPDATE_ID,
    type: "aws:cloudwatch/logGroup:LogGroup",
    urn: "urn:pulumi:jayair::ion-sandbox::sst:aws:Function$aws:cloudwatch/logGroup:LogGroup::FunctionBLogGroup",
    action: "created",
  });
  yield stateEvent({
    id: ++STATE_RES_ID,
    stageID: STAGE,
    update: UPDATE_ID,
    type: "pulumi:pulumi:Stack",
    urn: "urn:pulumi:jayair::ion-sandbox::pulumi:pulumi:Stack::ion-sandbox-jayair",
    action: "updated",
  });
  yield stateEvent({
    id: ++STATE_RES_ID,
    stageID: STAGE,
    update: UPDATE_ID,
    type: "aws:route53/record:Record",
    urn: "urn:pulumi:production::www::sst:aws:Astro$sst:aws:CDN$sst:aws:Certificate$aws:route53/record:Record::AstroCdnSslCNAMERecord65b719819635197c400ab3714200afd1ionsstdev",
    action: "updated",
  });
  yield stateEvent({
    id: ++STATE_RES_ID,
    stageID: STAGE,
    update: UPDATE_ID,
    type: "aws:iam/role:Role",
    urn: "urn:pulumi:jayair::ion-sandbox::sst:aws:Function$aws:iam/role:Role::FunctionBRole",
    action: "updated",
  });
  yield stateEvent({
    id: ++STATE_RES_ID,
    stageID: STAGE,
    update: UPDATE_ID,
    type: "aws:iam/role:Role",
    urn: "urn:pulumi:jayair::ion-sandbox::sst:aws:Function$aws:iam/role:Role::FunctionCRole",
    action: "updated",
  });
}

function* stateEventError(): Generator<DummyData, void, unknown> {
  yield stateEvent({
    id: ++STATE_RES_ID,
    stageID: STAGE,
    update: UPDATE_ID,
    type: "sst:aws:Function",
    urn: "urn:pulumi:jayair::ion-sandbox::sst:aws:Function::FunctionA",
    action: "deleted",
  });
}

function* issueBase(): Generator<DummyData, void, unknown> {
  yield issue({
    id: ISSUE_ID,
    error: "Error",
    message: "Some error message",
    stack: STACK_TRACE,
    invocation: invocation({
      startTime: DateTime.now().startOf("day"),
      messages: [
        `areallyreallylonglinethatshouldoverflowandwordwrapbutitdoesntbecauseitshouldntbeabletofitallthewaythroughthewidthofthepage`,
        `scanning logs {
  id: 'abcde12vgws358nwyjbb0n7m',
  workspaceID: 'ab1mmlwfjisrf38lxyjitj3a',
  timeCreated: '2023-11-02 13:36:22',
  timeUpdated: '2023-11-02 17:42:00',
  timeDeleted: null,
  userID: 'zxc94z5o4m2yenuii7y77jcl',
  profileID: 'qw5266007421c4ca08c3a9805d26d3081',
  stageID: 'ertyw9srjl3x3llq9f4iurmn',
  logGroup: '/aws/lambda/production-notes-app-busTargetbusdevOrderUpd-O5r7A2kRuBqp',
  timeStart: '2023-11-02 17:00:00',
  timeEnd: null
}`,
        `start 11/2/2023, 11:00 AM`,
        `sending poke`,
        `scanning from 11/2/2023, 11:00 AM to 11/2/2023, 5:57 PM`,
        `poke sent`,
        `created query 50a15af7-8263-4c2f-be80-6be2585973ab`,
        `bootstrap [
  {
    OutputKey: 'BucketName',
    OutputValue: 'sstbootstrap-euwest123op64b9-1ej2jgqb9j7yv'
  },
  { OutputKey: 'Version', OutputValue: '7.2' }
]`,
        `flushing invocations 1 flushed so far 0`,
        `2023-11-02T18:02:42.819Z ed9967cb-9637-432b-9b54-e80b006b1af6 Task timed out after 300.02 seconds`,
      ],
    }),
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
    stack: STACK_TRACE_RAW,
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
    stack: STACK_TRACE_FULL,
  });
  yield issueCount({
    group: ISSUE_ID_FULL_STACK_TRACE,
  });
}

function* issueLong(): Generator<DummyData, void, unknown> {
  yield func({
    id: ISSUE_FN_NAME_LONG,
    stage: STAGE_HAS_ISSUES,

    handler:
      "packages/path/to/function/that/should/overflow/because/its/too/long/and/it/keeps/going/because/it/really/is/way/too/long/function.handler",
    arn: `arn:aws:lambda:us-east-1:123456789012:function:${ISSUE_FN_NAME_LONG}`,
  });

  yield issue({
    id: ISSUE_ID_LONG,
    stage: STAGE_HAS_ISSUES,
    error:
      "Errorlongmessagethatisreallylongandshouldoverflowbecauseitstoolonganditkeepsgoingandgoingforareallylongtime",
    message:
      "Someerrormessagethat'salsowaytoolongandshouldoverflowbecauseitstoolonganditkeepsgoingandgoingforareallylongtime",
    fnName: ISSUE_FN_NAME_LONG,
  });
  yield issueCount({
    group: ISSUE_ID_LONG,
  });
}

function* issueMissingSourcemap(): Generator<DummyData, void, unknown> {
  yield func({
    id: ISSUE_FN_NAME_MISSING_SOURCEMAP,
    stage: STAGE_HAS_ISSUES,
    handler: "packages/no-source-map/function.handler",
    arn: `arn:aws:lambda:us-east-1:123456789012:function:${ISSUE_FN_NAME_MISSING_SOURCEMAP}`,
    missingSourcemap: true,
  });

  yield issue({
    id: ISSUE_ID_MISSING_SOURCEMAP,
    stage: STAGE_HAS_ISSUES,
    stack: STACK_TRACE_RAW,
    error: "Error Missing Sourcemap",
    message: "Some error message",
    fnName: ISSUE_FN_NAME_MISSING_SOURCEMAP,
  });
}

function* issueAlertsStar(): Generator<DummyData, void, unknown> {
  yield issueAlert({
    app: "*",
    stage: "*",
    destination: {
      properties: {
        users: "*",
      },
      type: "email",
    },
  });
  yield issueAlert({
    app: "*",
    stage: "*",
    destination: {
      properties: {
        channel: "#my-channel",
      },
      type: "slack",
    },
  });
}

function* issueAlertsSlackWarning(): Generator<DummyData, void, unknown> {
  const ALERT_ID = "alert-slack-warning";

  yield warning({
    stage: "some-stage",
    type: "issue_alert_slack",
    target: ALERT_ID,
  });
  yield issueAlert({
    id: ALERT_ID,
    app: "*",
    stage: "*",
    destination: {
      properties: {
        channel: "#my-channel",
      },
      type: "slack",
    },
  });
}

function* issueAlertsSingle(): Generator<DummyData, void, unknown> {
  yield issueAlert({
    app: [APP_LOCAL],
    stage: "*",
    destination: {
      properties: {
        users: "*",
      },
      type: "email",
    },
  });
  yield issueAlert({
    app: [APP_LOCAL],
    stage: [STAGE],
    destination: {
      properties: {
        users: "*",
      },
      type: "email",
    },
  });
  yield issueAlert({
    app: "*",
    stage: [STAGE],
    destination: {
      properties: {
        users: "*",
      },
      type: "email",
    },
  });
}

function* issueAlertsSingleTo(): Generator<DummyData, void, unknown> {
  yield issueAlert({
    app: [APP_LOCAL],
    stage: "*",
    destination: {
      properties: {
        users: [USER_ID],
      },
      type: "email",
    },
  });
}

function* issueAlertsDoubleTo(): Generator<DummyData, void, unknown> {
  yield user({ email: USER_ID_ISSUE_ALERT, active: true });

  yield issueAlert({
    app: "*",
    stage: "*",
    destination: {
      properties: {
        users: [USER_ID, USER_ID_ISSUE_ALERT],
      },
      type: "email",
    },
  });
}

function* issueAlertsMultipleFrom(): Generator<DummyData, void, unknown> {
  yield issueAlert({
    app: [
      APP_ISSUE_1,
      APP_ISSUE_2,
      APP_ISSUE_3,
      APP_ISSUE_4,
      APP_ISSUE_5,
      APP_ISSUE_6,
      APP_ISSUE_7,
      APP_ISSUE_8,
      APP_ISSUE_9,
    ],
    stage: "*",
    destination: {
      properties: {
        users: "*",
      },
      type: "email",
    },
  });
}

function* issueAlertsMultipleTo(): Generator<DummyData, void, unknown> {
  yield user({ email: USER_ID_ISSUE_1, active: true });
  yield user({ email: USER_ID_ISSUE_2, active: true });
  yield user({ email: USER_ID_ISSUE_3, active: true });
  yield user({ email: USER_ID_ISSUE_4, active: true });
  yield user({ email: USER_ID_ISSUE_5, active: true });
  yield user({ email: USER_ID_ISSUE_6, active: true });
  yield user({ email: USER_ID_ISSUE_7, active: true });
  yield user({ email: USER_ID_ISSUE_8, active: true });
  yield user({ email: USER_ID_ISSUE_9, active: true });

  yield issueAlert({
    app: "*",
    stage: "*",
    destination: {
      properties: {
        users: [
          USER_ID_ISSUE_1,
          USER_ID_ISSUE_2,
          USER_ID_ISSUE_3,
          USER_ID_ISSUE_4,
          USER_ID_ISSUE_5,
          USER_ID_ISSUE_6,
          USER_ID_ISSUE_7,
          USER_ID_ISSUE_8,
          USER_ID_ISSUE_9,
        ],
      },
      type: "email",
    },
  });
}

function* issueAlertsDoubleFrom(): Generator<DummyData, void, unknown> {
  yield issueAlert({
    app: [APP_ISSUE_1, APP_ISSUE_2],
    stage: "*",
    destination: {
      properties: {
        users: "*",
      },
      type: "email",
    },
  });
  yield issueAlert({
    app: [APP_ISSUE_1, APP_ISSUE_2],
    stage: [STAGE],
    destination: {
      properties: {
        users: "*",
      },
      type: "email",
    },
  });
}

function* issueAlertsOverflowFrom(): Generator<DummyData, void, unknown> {
  yield issueAlert({
    app: [APP_ISSUE_ALERT_LONG],
    stage: "*",
    destination: {
      properties: {
        users: "*",
      },
      type: "email",
    },
  });
}

function* issueAlertsOverflowTo(): Generator<DummyData, void, unknown> {
  yield issueAlert({
    app: "*",
    stage: "*",
    destination: {
      properties: {
        channel:
          "#areallyreallyreallylongslackchannelnamethatshouldoverflowbecauseitstoolonganditkeepsgoingandgoingforareallylongtime",
      },
      type: "slack",
    },
  });
}

function* invocationBase(): Generator<DummyData, void, unknown> {
  yield globalInvocation({
    duration: 788,
    startTime: DateTime.now().startOf("day"),
    messages: [
      `test log line cases`,
      `areallyreallylonglinethatshouldoverflowandwordwrapbutitdoesntbecauseitshouldntbeabletofitallthewaythroughthewidthofthepagebecauseitswaytoolongandwilloverflowalltheway`,
      `scanning logs {
  case: 'pre formatted text',
  id: 'abcde12vgws358nwyjbb0n7m',
  workspaceID: 'ab1mmlwfjisrf38lxyjitj3a',
  timeCreated: '2023-11-02 13:36:22',
  timeUpdated: '2023-11-02 17:42:00',
  timeDeleted: null,
  userID: 'zxc94z5o4m2yenuii7y77jcl',
  profileID: 'qw5266007421c4ca08c3a9805d26d3081',
  stageID: 'ertyw9srjl3x3llq9f4iurmn',
  logGroup: '/aws/lambda/production-notes-app-busTargetbusdevOrderUpd-O5r7A2kRuBqp',
  timeStart: '2023-11-02 17:00:00',
  timeEnd: null
}`,
      `start 11/2/2023, 11:00 AM`,
    ],
  });
}

function* invocationIncomplete(): Generator<DummyData, void, unknown> {
  yield globalInvocation({
    startTime: DateTime.now().minus({ day: 1 }).startOf("day"),
    messages: [`incomplete log`],
  });
}

function* invocationEmpty(): Generator<DummyData, void, unknown> {
  yield globalInvocation({
    duration: 410,
    startTime: DateTime.now().minus({ day: 2 }).startOf("day"),
    messages: [],
  });
}

function* invocationNoLog(): Generator<DummyData, void, unknown> {
  yield globalInvocation({
    startTime: DateTime.now().minus({ day: 3 }).startOf("day"),
    messages: [],
  });
}

function* invocationColdStart(): Generator<DummyData, void, unknown> {
  yield globalInvocation({
    cold: true,
    duration: 53,
    startTime: DateTime.now().minus({ day: 4 }).startOf("day"),
    messages: [`cold start`],
  });
}

function* invocationOverflowMessage(): Generator<DummyData, void, unknown> {
  yield globalInvocation({
    duration: 53,
    startTime: DateTime.now().minus({ day: 5 }).startOf("day"),
    messages: [
      `areallyreallylonglinethatshouldoverflowandwordwrapbutitdoesntbecauseitshouldntbeabletofitallthewaythroughthewidthofthepagebecauseitswaytoolongandwilloverflowalltheway`,
    ],
  });
}

function* invocationWithRequestResponse(): Generator<DummyData, void, unknown> {
  yield globalInvocation({
    duration: 119,
    input: {
      version: "2.0",
      routeKey: "POST /replicache/dummy/pull",
      rawPath: "/replicache/dummy/pull",
      authorization:
        "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiYWNjb3VudCIsInByb3BlcnRpZXMiOnsiYWNjb3VudElEIjoib2xneGZnOXA3NWQzdHQ1MXNjdTJuMzkyIiwiZW1haWwiOiJhaXJAbGl2ZS5jYSJ9LCJpYXQiOjE2OTU0MTE1NjR9.iwT9dUfm-qG8EneOUgyMEajIV2Ko_bYlXSCUoSmwyQyUD89GAoii_LXfnNqM9JR1VZrEEFBKS4Vxq1_i1FtW8vf3boOlrCT8iqYRn5BXuXx5-6X0JXb10dY51PqIYJgRAPzkH5w1yulg3BnQBaCfKWs349fZ6G2Cw7JCknDNZWLLlA_P9ovxfSJ_qBKXBxhJ99Z8Yz0u_OV4U8O2bZIezcnM221V2VzzKUYJ0CQqAClGYyvf7eBE9WWYsN4ghpcGp0GfiqUsATA6xIa1jaffUpiKwPbutXSLQJbrkI85S19HkTauOJ3cJ0RmEg3uJ2UNiXPAsNqHAtylGpSJsnLYHg",
      headers: {
        accept: "*/*",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en-CA,en-US;q=0.9,en;q=0.8",
      },
      isBase64Encoded: false,
    },
    output: {
      shortOption: "POST /replicache/dummy/pull",
      longOption:
        "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiYWNjb3VudCIsInByb3BlcnRpZXMiOnsiYWNjb3VudElEIjoib2xneGZnOXA3NWQzdHQ1MXNjdTJuMzkyIiwiZW1haWwiOiJhaXJAbGl2ZS5jYSJ9LCJpYXQiOjE2OTU0MTE1NjR9.iwT9dUfm-qG8EneOUgyMEajIV2Ko_bYlXSCUoSmwyQyUD89GAoii_LXfnNqM9JR1VZrEEFBKS4Vxq1_i1FtW8vf3boOlrCT8iqYRn5BXuXx5-6X0JXb10dY51PqIYJgRAPzkH5w1yulg3BnQBaCfKWs349fZ6G2Cw7JCknDNZWLLlA_P9ovxfSJ_qBKXBxhJ99Z8Yz0u_OV4U8O2bZIezcnM221V2VzzKUYJ0CQqAClGYyvf7eBE9WWYsN4ghpcGp0GfiqUsATA6xIa1jaffUpiKwPbutXSLQJbrkI85S19HkTauOJ3cJ0RmEg3uJ2UNiXPAsNqHAtylGpSJsnLYHg",
      nested: {
        option: "*/*",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en-CA,en-US;q=0.9,en;q=0.8",
      },
      booleanOption: false,
    },
    startTime: DateTime.now().minus({ day: 6 }).startOf("day"),
    messages: [`with request and response`],
  });
}

function* invocationErrorSimple(): Generator<DummyData, void, unknown> {
  yield globalInvocation({
    duration: 306,
    startTime: DateTime.now().minus({ day: 7 }).startOf("day"),
    messages: [`simple error`],
    errors: [
      {
        id: "1",
        error: "Error",
        message: "simple error",
        failed: false,
        stack: [],
      },
    ],
  });
}

function* invocationErrorMessageOverflow(): Generator<
  DummyData,
  void,
  unknown
> {
  yield globalInvocation({
    duration: 306,
    startTime: DateTime.now().minus({ day: 13 }).startOf("day"),
    messages: [`simple error`],
    errors: [
      {
        id: "1",
        error: "Error",
        message:
          "areallyreallylonglinethatshouldoverflowandwordwrapbutitdoesntbecauseitshouldntbeabletofitallthewaythroughthewidthofthepagebecauseitswaytoolongandwilloverflowalltheway",
        failed: false,
        stack: [],
      },
    ],
  });
}

function* invocationFailSimple(): Generator<DummyData, void, unknown> {
  yield globalInvocation({
    duration: 306,
    startTime: DateTime.now().minus({ day: 8 }).startOf("day"),
    messages: [`simple failure`],
    errors: [
      {
        id: "1",
        error: "Error",
        message: "simple failure",
        failed: true,
        stack: [],
      },
    ],
  });
}

function* invocationFailSimpleNoLog(): Generator<DummyData, void, unknown> {
  yield globalInvocation({
    duration: 306,
    startTime: DateTime.now().minus({ day: 8 }).startOf("day"),
    messages: [],
    errors: [
      {
        id: "1",
        error: "Error",
        message: "simple failure no log",
        failed: true,
        stack: [],
      },
    ],
  });
}

function* invocationFailMultiple(): Generator<DummyData, void, unknown> {
  yield globalInvocation({
    duration: 306,
    startTime: DateTime.now().minus({ day: 9 }).startOf("day"),
    messages: [`multiple failures`],
    errors: [
      {
        id: "1",
        error: "Error",
        message: "multiple failures 1",
        failed: true,
        stack: [],
      },
      {
        id: "2",
        error: "Error",
        message: "multiple failures 2",
        failed: true,
        stack: [],
      },
    ],
  });
}

function* invocationErrorStackTraceBase(): Generator<DummyData, void, unknown> {
  yield globalInvocation({
    duration: 306,
    startTime: DateTime.now().minus({ day: 10 }).startOf("day"),
    messages: [`simple failure`],
    errors: [
      {
        id: "1",
        error: "Error",
        message: "stack trace base",
        failed: true,
        stack: STACK_TRACE,
      },
    ],
  });
}

function* invocationErrorStackTraceRaw(): Generator<DummyData, void, unknown> {
  yield globalInvocation({
    duration: 306,
    startTime: DateTime.now().minus({ day: 10 }).startOf("day"),
    messages: [`simple failure`],
    errors: [
      {
        id: "1",
        error: "Error",
        message: "stack trace raw",
        failed: true,
        stack: STACK_TRACE_RAW,
      },
    ],
  });
}

function* invocationErrorStackTraceFull(): Generator<DummyData, void, unknown> {
  yield globalInvocation({
    duration: 306,
    startTime: DateTime.now().minus({ day: 10 }).startOf("day"),
    messages: [`simple failure`],
    errors: [
      {
        id: "1",
        error: "Error",
        message: "stack trace full",
        failed: true,
        stack: STACK_TRACE_FULL,
      },
    ],
  });
}

function* invocationFailMultipleWithStackTrace(): Generator<
  DummyData,
  void,
  unknown
> {
  yield globalInvocation({
    duration: 306,
    startTime: DateTime.now().minus({ day: 11 }).startOf("day"),
    messages: [`simple failure`],
    errors: [
      {
        id: "1",
        error: "Error",
        message: "multiple with stack trace 1",
        failed: true,
        stack: STACK_TRACE,
      },
      {
        id: "1",
        error: "Error",
        message: "multiple without stack trace 2",
        failed: true,
        stack: [],
      },
    ],
  });
}

interface WorkspaceProps {
  id: string;
  gated: boolean;
}
function workspace({ id, gated }: WorkspaceProps): DummyData {
  return {
    _type: "workspace",
    id,
    slug: id,
    timeDeleted: null,
    timeGated: gated ? DateTime.now().startOf("day").toSQL()! : null,
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
  unsupported?: boolean;
}
function stage({
  id,
  appID,
  region,
  unsupported,
  awsAccountID,
}: StageProps): DummyData {
  return {
    _type: "stage",
    id,
    appID,
    name: id,
    awsAccountID,
    timeDeleted: null,
    region: region || "us-east-1",
    unsupported: unsupported || false,
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

interface StripeProps {
  standing?: Billing.Stripe.Info["standing"];
}
function stripe({ standing }: StripeProps): DummyData {
  return {
    _type: "stripe",
    id: "123",
    customerID: "cus_123",
    subscriptionID: "sub_123",
    standing: standing || "good",
    subscriptionItemID: "sub_item_123",
    timeDeleted: null,
    timeTrialEnded: null,
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
  missingSourcemap?: boolean;
}
function func({
  id,
  arn,
  size,
  live,
  stage,
  handler,
  runtime,
  missingSourcemap,
}: FuncProps): DummyData {
  return resource({
    id,
    stage,
    type: "Function",
    metadata: {
      prefetchSecrets: false,
      handler,
      localId: id,
      secrets: [],
      runtime: runtime || "nodejs18.x",
      arn: arn || "arn:aws:lambda:us-east-1:123456789012:function:my-func",
      missingSourcemap,
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
  timeIgnored?: string;
  timeResolved?: string;
  invocation?: Invocation;
}
function issue({
  id,
  error,
  stage,
  fnName,
  message,
  invocation,
  timeIgnored,
  timeResolved,
  stack,
}: IssueProps): DummyData {
  return {
    _type: "issue",
    id,
    timeSeen: DateTime.now().startOf("day").toSQL()!,
    timeDeleted: null,
    invocation: invocation || null,
    timeIgnored: timeIgnored || null,
    timeResolved: timeResolved || null,
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
      timestamp: DateTime.now().startOf("day").toUnixInteger(),
    },
    ...timestamps,
  };
}

interface InvocationProps {
  input?: any;
  output?: any;
  response?: any;
  cold?: boolean;
  duration?: number;
  startTime: DateTime;
  messages?: string[];
  errors?: (ParsedError & { id: string })[];
}
function invocation({
  cold,
  input,
  errors,
  output,
  duration,
  messages,
  startTime,
}: InvocationProps): Invocation {
  return {
    id: createHash("sha256").update(`${INVOCATION_COUNT++}`).digest("hex"),
    input,
    output,
    cold: cold || false,
    source: "123",
    errors: errors || [],
    report:
      duration === undefined
        ? duration
        : {
            duration,
            memory: 128,
            size: 2048,
            xray: "eb1e33e8a81b697b75855af6bfcdbcbf7cbb",
          },
    start: startTime.valueOf(),
    logs: messages
      ? messages.map((message, i) => ({
          message,
          id: `log-${INVOCATION_COUNT}-${i}`,
          timestamp: startTime.plus({ seconds: 20 * i }).toMillis(),
        }))
      : [],
  };
}

function globalInvocation(props: InvocationProps): DummyData {
  return {
    _type: "invocation",
    ...invocation(props),
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
    logGroup: `/aws/lambda/${ISSUE_FN}`,
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

interface IssueAlertProps {
  id?: string;
  app: Issue.Alert.Source["app"];
  stage: Issue.Alert.Source["stage"];
  destination: Issue.Alert.Destination;
}
function issueAlert({
  id,
  app,
  stage,
  destination,
}: IssueAlertProps): DummyData {
  return {
    _type: "issueAlert",
    id: id || `${ISSUE_ALERT_COUNT++}`,
    source: {
      app,
      stage,
    },
    destination,
    timeDeleted: null,
    ...timestamps,
  };
}

interface UpdateProps {
  id: number;
  stage: string;
  errors?: State.Update["errors"];
  source?: "cli" | "ci";
  timeCreated?: string;
  timeStarted?: string;
  timeCompleted?: string;
  same?: number;
  created?: number;
  updated?: number;
  deleted?: number;
  command?: State.Update["command"];
}
function update({
  id,
  stage,
  errors,
  command,
  source,
  timeCreated,
  timeStarted,
  timeCompleted,
  same,
  created,
  updated,
  deleted,
}: UpdateProps): DummyData {
  return {
    _type: "stateUpdate",
    id: `${id}`,
    index: id,
    stageID: stage,
    command: command || "deploy",
    source:
      source === "ci"
        ? { type: "ci", properties: { runID: "run_123" } }
        : { type: "cli", properties: {} },
    time: {
      updated: DateTime.now().startOf("day").toISO()!,
      created: timeCreated || DateTime.now().startOf("day").toISO()!,
      started: timeStarted || DateTime.now().startOf("day").toISO()!,
      completed: timeCompleted,
    },
    resource: {
      same: same || 0,
      created: created || 0,
      updated: updated || 0,
      deleted: deleted || 0,
    },
    errors: errors || [],
  };
}

interface ResourceProps {
  id: number;
  stageID: State.ResourceEvent["stageID"];
  update: number;
  type: State.ResourceEvent["type"];
  urn: State.ResourceEvent["urn"];
  action: State.ResourceEvent["action"];
  outputs?: State.ResourceEvent["outputs"];
  inputs?: State.ResourceEvent["inputs"];
  parent?: State.ResourceEvent["parent"];
}
function stateEvent({
  id,
  stageID,
  update,
  type,
  urn,
  action,
  outputs,
  inputs,
  parent,
}: ResourceProps): DummyData {
  return {
    _type: "stateEvent",
    id: `${id}`,
    stageID,
    updateID: `${update}`,
    type,
    urn,
    action,
    outputs: outputs || {},
    inputs: inputs || {},
    parent,
    time: {
      created: DateTime.now().startOf("day").toISO()!,
      updated: DateTime.now().startOf("day").toISO()!,
    },
  };
}
