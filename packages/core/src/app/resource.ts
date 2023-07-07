export * as Resource from "./resource";

import { InferModel } from "drizzle-orm";
import { Metadata as SSTMetadata } from "sst/constructs/Metadata";
import { resource } from "./app.sql";
import { GetFunctionCommand, LambdaClient } from "@aws-sdk/client-lambda";
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";
import type { AWS } from "../aws";
import { StandardRetryStrategy } from "@aws-sdk/middleware-retry";

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

type Credentials = Awaited<ReturnType<typeof AWS.assumeRole>>;

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
    return {
      size: info.Configuration?.CodeSize,
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
    return {
      outputs:
        result.Stacks?.[0]?.Outputs?.filter(
          (o) =>
            o.OutputKey !== "SSTMetadata" && !o.OutputKey?.startsWith("Export")
        ) || [],
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
