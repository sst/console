import { Stage } from "@console/core/app";
import { Resource } from "@console/core/app/resource";
import { Log } from "@console/core/log";
import { withApiAuth } from "src/api";
import { ApiHandler, Response, useQueryParam } from "sst/node/api";

export const handler = ApiHandler(
  withApiAuth(async () => {
    const pointer = JSON.parse(useQueryParam("pointer")!);
    const stageID = useQueryParam("stageID")!;
    const groupID = useQueryParam("groupID")!;

    const config = await Stage.assumeRole(stageID);
    if (!config)
      throw new Response({
        statusCode: 400,
      });

    const result = await Log.expand({
      group: groupID,
      logGroup: pointer.logGroup,
      logStream: pointer.logStream,
      timestamp: pointer.timestamp,
      sourcemapKey: pointer.logGroup.split("/").pop()!,
      config,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: {
        "Content-Type": "application/json",
      },
    };
  })
);
