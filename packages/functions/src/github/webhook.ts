import { Github } from "@console/core/github";
import { App } from "octokit";
import { ApiHandler, useBody, useHeader } from "sst/node/api";
import { Config } from "sst/node/config";

const app = new App({
  appId: Config.GITHUB_APP_ID,
  privateKey: Config.GITHUB_PRIVATE_KEY,
  webhooks: {
    secret: Config.GITHUB_WEBHOOK_SECRET,
  },
});

export const handler = ApiHandler(async (event) => {
  app.webhooks.on("installation.deleted", async (event) => {
    const orgID = event.payload.installation.account!.id;
    await Github.disconnectAll(orgID);
  });

  const ret = await app.webhooks.verifyAndReceive({
    id: useHeader("x-github-delivery")!,
    name: useHeader("x-github-event") as any,
    signature: useHeader("x-hub-signature-256")!,
    payload: useBody()!,
  });

  console.log(event);
  return {
    statusCode: 200,
    body: "ok",
  };
});
