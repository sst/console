import { Github } from "@console/core/git/github";
import { Run } from "@console/core/run";
import { App } from "octokit";
import { ApiHandler, useBody, useHeader } from "sst/node/api";
import { Config } from "sst/node/config";
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

  // Get all apps connected to the repo
  const appRepos = await AppRepo.listByRepo({ type: "github", repoID });
  if (appRepos.length === 0) return;

  await AppRepo.setLastEvent({ repoID, gitContext: trigger });

  let sstConfig: Run.SstConfig | undefined;
  try {
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

    // Parse CI config
    sstConfig = await Run.parseSstConfig({
      content: file.data.content,
      trigger,
    });
  } catch (e: any) {
    await AppRepo.setLastEventError({ repoID, error: e.message });
    throw e;
  }

  // Do not trigger build
  if (!sstConfig) return;

  // Loop through all apps connected to the repo
  for (const appRepo of appRepos) {
    await withActor(
      {
        type: "system",
        properties: { workspaceID: appRepo.workspaceID },
      },
      async () => {
        try {
          await Run.create({
            appID: appRepo.appID,
            trigger,
            sstConfig: sstConfig!,
          });
        } catch (e: any) {
          await AppRepo.setLastEventError({
            appID: appRepo.appID,
            repoID,
            error: e.message,
          });
          throw e;
        }
      }
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
