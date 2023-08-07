import { Resource } from "@console/core/app/resource";

function resource<Type extends Resource.Info["type"]>(
  type: Type,
  id: string,
  metadata: Extract<Resource.Info, { type: Type }>["metadata"],
  enrichment?: Extract<Resource.Info, { type: Type }>["enrichment"]
): Extract<Resource.Info, { type: Type }> {
  return {
    id,
    type: type as any,
    addr: id,
    cfnID: id,
    stackID: "stack",
    stageID: "dummy-stage",
    metadata: metadata as any,
    enrichment: enrichment || {},
    timeCreated: new Date().toISOString(),
    timeDeleted: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    workspaceID: "workspace",
  } as any;
}

export function func(
  id: string,
  handler: string,
  size?: number,
  runtime?: Extract<Resource.Info, { type: "Function" }>["metadata"]["runtime"]
) {
  return resource(
    "Function",
    id,
    {
      arn: "arn:aws:lambda:us-east-1:123456789012:function:my-func",
      localId: id,
      secrets: [],
      handler,
      runtime: runtime || "nodejs18.x",
    },
    {
      size: size || 2048,
      runtime: "nodejs18.x",
      live: true,
    }
  );
}

function ref(id: string) {
  return {
    node: id,
    stack: "",
  };
}

const EMPTY: Resource.Info[] = [];

const DEFAULT = [
  resource(
    "Stack",
    "stack",
    {},
    {
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
    }
  ),
  resource("Api", "api", {
    url: "https://example.com",
    routes: [
      {
        route: "GET /todo",
        type: "function",
        fn: ref("index"),
      },
      {
        route: "GET /notes",
        type: "function",
        fn: ref("notes_get"),
      },
      {
        route: "PUT /notes",
        type: "function",
        fn: ref("notes_get"),
      },
      {
        route: "UPDATE /notes",
        type: "function",
        fn: ref("notes_get"),
      },
      {
        route: "PATCH /notes",
        type: "function",
        fn: ref("notes_get"),
      },
      {
        route: "PATCH .",
        type: "function",
        fn: ref("notes_get"),
      },
      {
        route:
          "POST /with/an/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long",
        type: "function",
        fn: ref("notes_post"),
      },
    ],
    graphql: false,
    httpApiId: "someapi",
    customDomainUrl: "https://example.com",
  }),
  resource("Api", "long-api", {
    url: "https://long-auto-generated-cloudfront-aws-url-that-should-overflow-because-its-too-long-and-keeps-going-long-auto-generated-cloudfront-aws-url-that-should-overflow-because-its-too-long-and-keeps-going.com",
    routes: [
      {
        route: "GET /",
        type: "function",
        fn: ref("index"),
      },
    ],
    graphql: false,
    httpApiId: "someapi",
    customDomainUrl: undefined,
  }),
  resource("ApiGatewayV1Api", "apiv1-api", {
    url: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com/jayair/",
    routes: [
      {
        fn: ref("index"),
        type: "function",
        route: "ANY /{proxy+}",
      },
    ],
    restApiId: "someapi",
    customDomainUrl: undefined,
  }),
  resource("Api", "no-routes", {
    url: "https://api.com",
    routes: [],
    graphql: false,
    httpApiId: "someapi",
    customDomainUrl: undefined,
  }),
  resource("Cron", "cronjob", {
    job: {
      node: "index",
      stack: "stack",
    },
    ruleName: "jayair-console-Dummy-cronjobRuleFEA4C4A4-1P314X49EP7CP",
    schedule: "rate(1 day)",
  }),
  resource("Bucket", "uploads", {
    name: "jayair-console-dummy-uploadsbucket10132eb4-jypzgdnipek",
    notifications: [
      {
        node: "index",
        stack: "stack",
      },
    ],
    notificationNames: ["myNotification"],
  }),
  resource("EventBus", "event-bus", {
    eventBusName: "event-bus",
    rules: [
      {
        key: "rule-1",
        targets: [
          {
            node: "index",
            stack: "stack",
          },
        ],
        targetNames: ["app_stage_connected_1_rule"],
      },
    ],
  }),
  resource("StaticSite", "web", {
    path: "./packages/web/workspace",
    customDomainUrl: undefined,
    environment: {},
    url: "https://long-auto-generated-cloudfront-aws-url-that-should-overflow-because-its-too-long-and-keeps-going-long-auto-generated-cloudfront-aws-url-that-should-overflow-because-its-too-long-and-keeps-going.com",
  }),
  resource("NextjsSite", "nextjs-site-local-no-custom-domain", {
    customDomainUrl: undefined,
    server: "arn:aws:lambda:us-east-1:123456789012:function:my-func",
    path: "./packages/nextjs-site",
    edge: false,
    mode: "deployed",
    secrets: [],
    url: "",
    runtime: "nodejs18.x",
  }),
  resource("NextjsSite", "nextjs-site", {
    customDomainUrl: "https://nextjs-site.com",
    server: "arn:aws:lambda:us-east-1:123456789012:function:my-func",
    path: "packages/nextjs-site",
    edge: false,
    mode: "deployed",
    secrets: [],
    url: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com",
    runtime: "nodejs18.x",
  }),
  resource("SvelteKitSite", "svelte-site", {
    customDomainUrl: "https://svelte-site.com",
    server: "arn:aws:lambda:us-east-1:123456789012:function:my-func",
    path: "packages/svelte-site",
    edge: false,
    mode: "deployed",
    secrets: [],
    url: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com",
    runtime: "nodejs18.x",
  }),
  resource("RemixSite", "remix-site", {
    customDomainUrl: "https://remix-site.com",
    server: "arn:aws:lambda:us-east-1:123456789012:function:my-func",
    path: "packages/remix-site",
    edge: false,
    mode: "deployed",
    secrets: [],
    url: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com",
    runtime: "nodejs18.x",
  }),
  resource("AstroSite", "astro-site", {
    customDomainUrl: "https://astro-site.com",
    server: "arn:aws:lambda:us-east-1:123456789012:function:my-func",
    path: "packages/astro-site",
    edge: false,
    mode: "deployed",
    secrets: [],
    url: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com",
    runtime: "nodejs18.x",
  }),
  resource("SolidStartSite", "solid-site", {
    customDomainUrl: "https://solid-site.com",
    server: "arn:aws:lambda:us-east-1:123456789012:function:my-func",
    path: "packages/solid-site",
    edge: false,
    mode: "deployed",
    secrets: [],
    url: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com",
    runtime: "nodejs18.x",
  }),
  resource("Cognito", "cognito-auth", {
    identityPoolId: "someid",
    userPoolId: "someid",
    triggers: [
      {
        fn: {
          node: "index",
          stack: "stack",
        },
        name: "consumer1",
      },
    ],
  }),
  resource("Table", "notes-table", {
    consumers: [
      {
        fn: {
          node: "index",
          stack: "stack",
        },
        name: "consumer1",
      },
    ],
    tableName: "jayair-console-dummy-notes-table",
  }),
  resource("Queue", "my-queue", {
    name: "jayair-console-my-queue",
    url: "https://sqs.us-east-1.amazonaws.com/917397401067/jayair-console-my-queue",
    consumer: {
      node: "index",
      stack: "stack",
    },
  }),
  resource("KinesisStream", "my-stream", {
    consumers: [
      {
        fn: {
          node: "index",
          stack: "stack",
        },
        name: "consumer1",
      },
    ],
    streamName: "jayair-console-my-stream",
  }),
  resource("Topic", "my-topic", {
    topicArn: "arn:aws:sns:us-east-1:917397401067:jayair-console-my-topic",
    subscribers: [
      {
        node: "index",
        stack: "stack",
      },
    ],
    subscriberNames: ["subscriber1"],
  }),
  resource("Script", "my-script", {
    createfn: ref("index"),
    deletefn: ref("index"),
    updatefn: ref("index"),
  }),
  resource("AppSync", "appsync-api", {
    dataSources: [
      {
        fn: {
          node: "index",
          stack: "stack",
        },
        name: "notesDs",
      },
    ],
    customDomainUrl: undefined,
    url: "https://3ec3bjoisfaxhgsubrayz5z3fa.appsync-api.us-east-1.amazonaws.com/graphql",
    appSyncApiId: "lz26zxwynve2dopyjdd2ekve34",
    appSyncApiKey: "da2-g63kqnmio5eyhbbv4dz6fk2x4y",
  }),
  resource("WebSocketApi", "ws-api", {
    url: "wss://h7waex57g8.execute-api.us-east-1.amazonaws.com/jayair",
    routes: [
      {
        route: "$connect",
        fn: ref("index"),
      },
      {
        route: "$default",
        fn: ref("index"),
      },
      {
        route: "$disconnect",
        fn: ref("index"),
      },
      {
        route: "$sendMessage",
        fn: ref("index"),
      },
    ],
    customDomainUrl: undefined,
    httpApiId: "someapi",
  }),
  resource("WebSocketApi", "ws-api-custom-domain", {
    url: "wss://h7waex57g8.execute-api.us-east-1.amazonaws.com/jayair",
    routes: [
      {
        route: "$connect",
        fn: ref("index"),
      },
    ],
    customDomainUrl: "ws://api.sst.dev",
    httpApiId: "someapi",
  }),
  resource("RDS", "my-rds", {
    engine: "postgresql11.13",
    secretArn: "arn",
    clusterArn: "arn",
    clusterIdentifier: "jayair-console-my-rds",
    defaultDatabaseName: "acme",
    types: undefined,
    migrator: undefined,
  }),
  func("index", "packages/function.handler"),
  func("notes_get", "packages/notes.handler", 20400800000),
  func("notes_post", "packages/notes.handler", 2048000),
  func("go_func", "packages/others/go.handler", 204123, "go1.x"),
  func("java_func", "packages/others/java.handler", 204123, "java17"),
  func("node_func", "packages/others/node.handler", 204123, "nodejs18.x"),
  func("python_func", "packages/others/python.handler", 204123, "python3.10"),
  func("dotnet_func", "packages/others/dotnet.handler", 204123, "dotnet6"),
  func("rust_func", "packages/others/rust.handler", 204123, "rust"),
  func(
    "container_func",
    "packages/others/container.handler",
    204123,
    "container"
  ),
  func("other_func", "packages/others/func.handler", 2048000),
];

const NOT_SUPPORTED = [
  resource(
    "Stack",
    "stack",
    {},
    {
      version: "1.0.0",
      outputs: [],
    }
  ),
];

const PARTLY_SUPPORTED = [
  resource(
    "Stack",
    "stackA",
    {},
    {
      version: "1.0.0",
      outputs: [],
    }
  ),
  resource(
    "Stack",
    "stackB",
    {},
    {
      version: "2.19.2",
      outputs: [],
    }
  ),
  resource("Table", "notes-table", {
    consumers: [
      {
        fn: {
          node: "index",
          stack: "stack",
        },
        name: "consumer1",
      },
    ],
    tableName: "jayair-console-dummy-notes-table",
  }),
  func("index", "packages/function.handler"),
];

export const DUMMY_RESOURCES = {
  EMPTY,
  DEFAULT,
  NOT_SUPPORTED,
  PARTLY_SUPPORTED,
};
