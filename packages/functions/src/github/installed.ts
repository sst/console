import { ApiHandler, Response } from "sst/node/api";
import { Github } from "@console/core/git/github";
import { withActor } from "@console/core/actor";

export const handler = ApiHandler(async (event) => {
  const workspaceID = event.queryStringParameters?.state;
  const installationID = parseInt(
    event.queryStringParameters?.installation_id ?? ""
  );
  if (!installationID)
    throw new Response({
      statusCode: 401,
      body: "Unauthorized",
    });

  // User has authorized the app
  if (workspaceID) {
    await withActor(
      {
        type: "system",
        properties: {
          workspaceID,
        },
      },
      async () => {
        await Github.connect(installationID);
      }
    );
  }

  // No workspaceID when the installation is updated from GitHub console
  if (!workspaceID) {
    await withActor({ type: "public" }, async () => {
      await Github.Events.Installed.publish({ installationID });
    });
  }

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
