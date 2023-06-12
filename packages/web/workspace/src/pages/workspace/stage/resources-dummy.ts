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
        fn: ref("my-func"),
      },
    ],
    graphql: false,
    httpApiId: "someapi",
    customDomainUrl: "https://example.com",
  }),
  func("my-func", "packages/function.handler"),
];
