import { drizzle } from "drizzle-orm/planetscale-serverless";
import { Client, connect } from "@planetscale/database";
import { Config } from "sst/node/config";
import { fetch } from "undici";
export * from "drizzle-orm";

const client = new Client({
  host: "aws.connect.psdb.cloud",
  username: Config.PLANETSCALE_USERNAME,
  password: Config.PLANETSCALE_PASSWORD,
  fetch,
});

export const db = drizzle(client, {
  logger:
    process.env.DRIZZLE_LOG === "true"
      ? {
          logQuery(query, params) {
            console.log({
              query,
              params: params.length,
            });
          },
        }
      : undefined,
});
