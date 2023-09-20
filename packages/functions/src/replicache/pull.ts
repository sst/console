import { ApiHandler } from "sst/node/api";
import { PullResponseV0 } from "replicache";
import { NotPublic, withApiAuth } from "../api";

export const handler = ApiHandler(
  withApiAuth(async () => {
    NotPublic();

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
  }),
);
