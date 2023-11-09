import { Lambda } from "@console/core/lambda";
import { withApiAuth } from "src/api";
import { ApiHandler, useJsonBody } from "sst/node/api";

export const handler = ApiHandler(
  withApiAuth(async () => {
    const body = useJsonBody();
    const requestID = await Lambda.invoke(body);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestID,
      }),
    };
  })
);
