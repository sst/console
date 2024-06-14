import { Config } from "sst/node/config";
import { ApiHandler } from "sst/node/api";

export const handler = ApiHandler(async (event) => {
  const workspaceID = event.queryStringParameters?.workspaceID;
  const appName =
    Config.STAGE === "production"
      ? "sst-console"
      : `sst-console-${Config.STAGE}`;
  return {
    statusCode: 302,
    headers: {
      location: `https://github.com/apps/${appName}/installations/new?state=${workspaceID}`,
    },
  };
});
