import type { Config } from "drizzle-kit";

const connection = {
  user: process.env["SST_Secret_value_PLANETSCALE_USERNAME"],
  password: process.env["SST_Secret_value_PLANETSCALE_PASSWORD"],
  host: "aws.connect.psdb.cloud",
};
export default {
  out: "./migrations/",
  strict: true,
  schema: "./src/**/*.sql.ts",
  verbose: true,
  driver: "mysql2",
  dbCredentials: {
    connectionString: `mysql://${connection.user}:${connection.password}@${connection.host}:3306/sst?ssl={"rejectUnauthorized":true}`,
  },
} satisfies Config;
