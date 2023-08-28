import { ApiHandler } from "sst/node/api";
import { PullResponseV0 } from "replicache";
import { NotPublic } from "../api";

export const handler = ApiHandler(async () => {
  await NotPublic();

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
