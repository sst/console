export * as Resource from "./resource";

import { InferModel } from "drizzle-orm";
import { Metadata } from "sst/constructs/Metadata";
import { resource } from "./app.sql";
import { GetFunctionCommand, LambdaClient } from "@aws-sdk/client-lambda";
import type { AWS } from "../aws";
import { StandardRetryStrategy } from "@aws-sdk/middleware-retry";

type Model = InferModel<typeof resource>;

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

export const Enrichers = {
  async Function(metadata, credentials, region) {
    console.log("enriching function", metadata);
    const client = new LambdaClient({
      credentials,
      region,
      retryStrategy: new StandardRetryStrategy(async () => 10000, {
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
      }),
    });
    const info = await client.send(
      new GetFunctionCommand({
        FunctionName: metadata.arn,
      })
    );
    return {
      size: info.Configuration?.CodeSize,
    };
  },
} satisfies {
  [key in Metadata["type"]]?: (
    metadata: Extract<Metadata, { type: key }>["data"],
    credentials: Credentials,
    region: string
  ) => Promise<any>;
};
