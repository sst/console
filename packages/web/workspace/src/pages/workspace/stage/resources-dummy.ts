import { Resource } from "@console/core/app/resource";

function resource<Type extends Resource.Info["type"]>(
  type: Type,
  id: string,
  metadata: Extract<Resource.Info, { type: Type }>["metadata"],
  enrichment?: Extract<Resource.Info, { type: Type }>["enrichment"]
): Resource.Info {
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
  };
}

function func(id: string, handler: string) {
  return resource(
    "Function",
    id,
    {
      arn: "arn:aws:lambda:us-east-1:123456789012:function:my-func",
      localId: id,
      secrets: [],
      handler,
    },
    {
      size: 2048,
    }
  );
}

function ref(id: string) {
  return {
    node: id,
    stack: "",
  };
}

export const DUMMY_RESOURCES = [
  /*
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
  resource("ApiGatewayV1Api", "another-api", {
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
  resource(
    "StaticSite",
    "web",
    {
      path: "packages/web/workspace",
      customDomainUrl: undefined,
      environment: {},
    },
    {
      cloudfrontUrl:
        "https://long-auto-generated-cloudfront-aws-url-that-should-overflow-because-its-too-long-and-keeps-going-long-auto-generated-cloudfront-aws-url-that-should-overflow-because-its-too-long-and-keeps-going.com",
    }
  ),
  resource(
    "NextjsSite",
    "nextjs-site-local-no-custom-domain",
    {
      customDomainUrl: undefined,
      server: "arn:aws:lambda:us-east-1:123456789012:function:my-func",
      path: "packages/nextjs-site",
    },
    {
      cloudfrontUrl: undefined,
    }
  ),
  */
  /*
  resource(
    "NextjsSite",
    "nextjs-site",
    {
      customDomainUrl: "https://nextjs-site.com",
      server: "arn:aws:lambda:us-east-1:123456789012:function:my-func",
      path: "packages/nextjs-site",
    },
    {
      cloudfrontUrl: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com",
    }
  ),
  resource(
    "SvelteKitSite",
    "svelte-site",
    {
      customDomainUrl: "https://svelte-site.com",
      server: "arn:aws:lambda:us-east-1:123456789012:function:my-func",
      path: "packages/svelte-site",
    },
    {
      cloudfrontUrl: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com",
    }
  ),
  resource(
    "RemixSite",
    "remix-site",
    {
      customDomainUrl: "https://remix-site.com",
      server: "arn:aws:lambda:us-east-1:123456789012:function:my-func",
      path: "packages/remix-site",
    },
    {
      cloudfrontUrl: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com",
    }
  ),
  resource(
    "AstroSite",
    "astro-site",
    {
      customDomainUrl: "https://astro-site.com",
      server: "arn:aws:lambda:us-east-1:123456789012:function:my-func",
      path: "packages/astro-site",
    },
    {
      cloudfrontUrl: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com",
    }
  ),
  resource(
    "SolidStartSite",
    "solid-site",
    {
      customDomainUrl: "https://solid-site.com",
      server: "arn:aws:lambda:us-east-1:123456789012:function:my-func",
      path: "packages/solid-site",
    },
    {
      cloudfrontUrl: "https://ba0e4aszwi.execute-api.us-east-1.amazonaws.com",
    }
  ),
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
  resource("WebSocketApi", "ws-api-custom-domain", {
    routes: [
      {
        route: "$connect",
        fn: ref("index"),
      },
    ],
    customDomainUrl: undefined,
    httpApiId: "someapi",
  }),
  resource("WebSocketApi", "ws-api", {
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
  */
  func("index", "packages/function.handler"),
  func("notes_get", "packages/notes.handler"),
  func("notes_post", "packages/notes.handler"),
];
