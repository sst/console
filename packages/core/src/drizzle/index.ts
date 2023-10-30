import { drizzle } from "drizzle-orm/planetscale-serverless";
import { connect } from "@planetscale/database";
import { Config } from "sst/node/config";
import { fetch } from "undici";
export * from "drizzle-orm";

const connection = connect({
  host: "aws.connect.psdb.cloud",
  username: Config.PLANETSCALE_USERNAME,
  password: Config.PLANETSCALE_PASSWORD,
  fetch,
});

export const db = drizzle(connection, {
  logger: process.env.DRIZZLE_LOG === "true",
});
