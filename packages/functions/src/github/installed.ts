import { ApiHandler, Response } from "sst/node/api";
import { Github } from "@console/core/github";
import { withActor } from "@console/core/actor";

export const handler = ApiHandler(async (event) => {
  const workspaceID = event.queryStringParameters?.state;
  const installationId = parseInt(
    event.queryStringParameters?.installation_id ?? ""
  );
  if (!installationId || !workspaceID)
    throw new Response({
      statusCode: 401,
      body: "Unauthorized",
    });

  await withActor(
    {
      type: "system",
      properties: {
        workspaceID,
      },
    },
    async () => {
      await Github.connect(installationId);
    }
  );

  return {
    statusCode: 200,
    headers: {
      "content-type": "text/html",
    },
    body: `
      <html>
        <script>
          if (window.opener) {
            window.opener.postMessage("github.success", "*")
            window.close()
          }
        </script>
      `,
  };
});
