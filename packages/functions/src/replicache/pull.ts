import { ApiHandler } from "sst/node/api";
import { PullResponseV0 } from "replicache";
import { NotPublic, useApiAuth } from "../api";
import { provideActor } from "@console/core/actor";

export const handler = ApiHandler(async () => {
  provideActor(await useApiAuth());
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
});
