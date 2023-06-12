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
  resource("Api", "api", {
    url: "https://example.com",
    routes: [
      {
        route: "GET /",
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
  resource("Api", "no-routes", {
    url: "https://api.com",
    routes: [],
    graphql: false,
    httpApiId: "someapi",
    customDomainUrl: undefined,
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
  func("index", "packages/function.handler"),
  func("notes_get", "packages/notes.handler"),
  func("notes_post", "packages/notes.handler"),
];
