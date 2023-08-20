import { ApiHandler } from "sst/node/api";
import { PullResponseV0 } from "replicache";

export const handler = ApiHandler(async () => {
  const response: PullResponseV0 = {
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
