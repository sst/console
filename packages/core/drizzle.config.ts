import { defineConfig } from "drizzle-kit";

const connection = {
  user: process.env["SST_Secret_value_PLANETSCALE_USERNAME"],
  password: process.env["SST_Secret_value_PLANETSCALE_PASSWORD"],
  host: "aws.connect.psdb.cloud",
};
export default defineConfig({
  out: "./migrations/",
  strict: true,
  schema: "./src/**/*.sql.ts",
  verbose: true,
  dialect: "mysql",
  dbCredentials: {
    url: `mysql://${connection.user}:${connection.password}@${connection.host}/sst`,
  },
});
