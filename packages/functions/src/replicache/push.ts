import { ApiHandler } from "sst/node/api";
import { PushResponse } from "replicache";

export const handler = ApiHandler(async () => {
  const response: PushResponse = {
    error: "VersionNotSupported",
  };

  return {
    statusCode: 200,
    body: JSON.stringify(response),
    headers: {
      "Content-Type": "application/json",
    },
  };
});
