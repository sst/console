export * as Resource from "./resource";

import { InferModel } from "drizzle-orm";
import { Metadata as SSTMetadata } from "sst/constructs/Metadata";
import { resource } from "./app.sql";
import { GetFunctionCommand, LambdaClient } from "@aws-sdk/client-lambda";
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";
import type { Credentials } from "../aws";
import { StandardRetryStrategy } from "@aws-sdk/middleware-retry";
import { event } from "../event";
import { z } from "zod";
import { zod } from "../util/zod";
import { useTransaction } from "../util/transaction";
import { and, eq } from "drizzle-orm";
import { useWorkspace } from "../actor";

export const Events = {
  Updated: event("app.resource.updated", {
    resourceID: z.string().nonempty(),
  }),
};

type Model = InferModel<typeof resource>;

type Metadata =
  | SSTMetadata
  | {
      type: "Stack";
      data: {};
    };

export type Info = {
  [key in Metadata["type"]]: Model & {
    type: key;
    metadata: Extract<Metadata, { type: key }>["data"];
    enrichment: key extends keyof typeof Enrichers
      ? Awaited<ReturnType<(typeof Enrichers)[key]>>
      : {};
  };
}[Metadata["type"]];

const RETRY_STRATEGY = new StandardRetryStrategy(async () => 10000, {
  retryDecider: (e: any) => {
    if (
      [
        "ThrottlingException",
        "Throttling",
        "TooManyRequestsException",
        "OperationAbortedException",
        "TimeoutError",
        "NetworkingError",
      ].includes(e.name)
    ) {
      return true;
    }
    console.error("not retrying", e);
    return false;
  },
  delayDecider: (_, attempts) => {
    return Math.min(1.5 ** attempts * 100, 5000);
  },
  // AWS SDK v3 has an idea of "retry tokens" which are used to
  // prevent multiple retries from happening at the same time.
  // This is a workaround to disable that.
  retryQuota: {
    hasRetryTokens: () => true,
    releaseRetryTokens: () => {},
    retrieveRetryTokens: () => 1,
  },
});

export const Enrichers = {
  async Function(resource, credentials, region) {
    const client = new LambdaClient({
      credentials,
      region,
      retryStrategy: RETRY_STRATEGY,
    });
    const info = await client.send(
      new GetFunctionCommand({
        FunctionName: resource.data.arn,
      })
    );
    console.log(info.Configuration?.Environment?.Variables);
    return {
      size: info.Configuration?.CodeSize,
      live: Boolean(
        info.Configuration?.Environment?.Variables?.SST_FUNCTION_ID
      ),
    };
  },
  async WebSocketApi() {
    return { cloudfrontUrl: "" };
  },
  async Stack(resource, credentials, region) {
    const client = new CloudFormationClient({
      credentials,
      region,
      retryStrategy: RETRY_STRATEGY,
    });

    const result = await client.send(
      new DescribeStacksCommand({
        StackName: resource.id,
      })
    );
    const [stack] = result.Stacks || [];
    const parsed = JSON.parse(
      stack?.Outputs?.find((o) => o.OutputKey === "SSTMetadata")?.OutputValue ||
        "{}"
    );
    return {
      outputs:
        stack?.Outputs?.filter(
          (o) =>
            o.OutputKey !== "SSTMetadata" && !o.OutputKey?.startsWith("Export")
        ) || [],
      version: parsed.version as string | undefined,
    } as const;
  },
} satisfies {
  [key in Metadata["type"]]?: (
    resource: {
      id: string;
      data: Extract<Metadata, { type: key }>["data"];
    },
    credentials: Credentials,
    region: string
  ) => Promise<any>;
};

export const fromID = zod(z.string().nonempty(), async (id) =>
  useTransaction((tx) =>
    tx
      .select()
      .from(resource)
      .where(and(eq(resource.workspaceID, useWorkspace()), eq(resource.id, id)))
      .execute()
      .then((x) => x[0])
  )
);

export const enrich = zod(
  z.object({
    resourceID: z.string().nonempty(),
    credentials: z.custom<Credentials>(),
    region: z.string(),
  }),
  async (input) =>
    useTransaction(async () => {
      const resource = await fromID(input.resourceID);
      if (!resource) return;
      const enricher = Enrichers[resource.type as keyof typeof Enrichers];
      if (!enricher) return;
      await enricher(
        {
          id: resource.cfnID,
          data: resource.metadata as any,
        },
        input.credentials,
        input.region
      );
    })
);
