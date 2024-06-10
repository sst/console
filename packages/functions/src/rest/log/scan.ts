import { Stage } from "@console/core/app/stage";
import { Log } from "@console/core/log";
import { withApiAuth } from "src/api";
import { ApiHandler, useJsonBody, useQueryParams } from "sst/node/api";
import { z } from "zod";

const Body = z.object({
  stageID: z.string(),
  requestID: z.string().optional(),
  timestamp: z.number({ coerce: true }),
  logGroup: z.string(),
  logStream: z.string(),
});

export const handler = ApiHandler(
  withApiAuth(async () => {
    const body = Body.parse(useQueryParams());
    let start = Date.now() - 2 * 60 * 1000;
    console.log("tailing from", start);
    const config = await Stage.assumeRole(body.stageID);
    if (!config)
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: "Failed to assume role" }),
      };

    const logs = await Log.scan({
      ...body,
      config,
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(logs),
    };
  }),
);
