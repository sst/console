import { Github } from "@console/core/git/github";
import { Run } from "@console/core/run";
import { App } from "octokit";
import { ApiHandler, useBody, useHeader } from "sst/node/api";
import { Config } from "sst/node/config";
import * as fs from "fs/promises";
import { execSync } from "child_process";
import { AppRepo } from "@console/core/app/repo";
import { withActor } from "@console/core/actor";
import { Trigger } from "@console/core/run/run.sql";

const app = new App({
  appId: Config.GITHUB_APP_ID,
  privateKey: Config.GITHUB_PRIVATE_KEY,
  webhooks: {
    secret: Config.GITHUB_WEBHOOK_SECRET,
  },
});
app.webhooks.on("installation.deleted", async (event) => {
  const installationID = event.payload.installation.id;
  await Github.disconnectAll(installationID);
});

app.webhooks.on("push", async (event) => {
  const repoID = event.payload.repository.id;
  const branch = event.payload.ref.replace("refs/heads/", "");
  const commitID = event.payload.head_commit?.id!;

  // Get all apps connected to the repo
  const apps = await AppRepo.listByRepo({ type: "github", repoID });
  if (apps.length === 0) return;

  // Get `sst.config.ts` file
  const file = await event.octokit.rest.repos.getContent({
    owner: event.payload.repository.owner!.login,
    repo: event.payload.repository.name,
    ref: commitID,
    path: "sst.config.ts",
  });
  if (!("content" in file.data)) {
    throw new Error("sst.config.ts not found");
  }

  // Build git context
  const trigger: Trigger = {
    source: "github",
    type: "push",
    repo: {
      id: repoID,
      owner: event.payload.repository.owner!.login,
      repo: event.payload.repository.name,
    },
    branch,
    commit: {
      id: commitID,
      message: event.payload.head_commit?.message?.substring(0, 100)!,
    },
    sender: {
      id: event.payload.sender?.id!,
      username: event.payload.sender?.login!,
    },
  };

  // Parse CI config
  const config = await Run.parseSstConfig({
    content: file.data.content,
    trigger,
  });

  // Do not trigger build
  if (!config.ci.config.stage) return;

  // Loop through all apps connected to the repo
  const oauthToken = await event.octokit
    .auth({ type: "installation" })
    .then((x: any) => x.token);
  for (const app of apps) {
    await withActor(
      {
        type: "system",
        properties: { workspaceID: app.workspaceID },
      },
      () =>
        Run.create({
          appID: app.appID,
          cloneUrl: `https://oauth2:${oauthToken}@github.com/${trigger.repo.owner}/${trigger.repo.repo}.git`,
          trigger,
          region: config.region,
          appConfig: config.app,
          ciConfig: config.ci,
        })
    );
  }
});

export const handler = ApiHandler(async (event) => {
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
