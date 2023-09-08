import { provideActor } from "@console/core/actor";
import { Stage } from "@console/core/app";
import { Resource } from "@console/core/app/resource";
import { Log } from "@console/core/log";
import { useApiAuth } from "src/api";
import { ApiHandler, Response, useQueryParam } from "sst/node/api";

export const handler = ApiHandler(async (req) => {
  provideActor(await useApiAuth());

  const pointer = JSON.parse(useQueryParam("pointer")!);
  const stageID = useQueryParam("stageID")!;

  const config = await Stage.assumeRole(stageID);
  if (!config)
    throw new Response({
      statusCode: 400,
    });

  const result = await Log.expand({
    logGroup: pointer.logGroup,
    logStream: pointer.logStream,
    timestamp: pointer.timestamp,
    functionArn: pointer.logGroup
      .replace("log-group:/aws/lambda/", "function:")
      .replace(":logs:", ":lambda:"),
    config,
  });

  return {
    statusCode: 200,
    body: JSON.stringify(result),
    headers: {
      "Content-Type": "application/json",
    },
  };
});
