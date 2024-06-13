import { Github } from "@console/core/git/github";
import { Run } from "@console/core/run";
import { App, Octokit } from "octokit";
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

app.webhooks.on(
  ["pull_request.opened", "pull_request.synchronize"],
  async (event) => {
    const commitID = event.payload.pull_request.head.sha;
    const owner = event.payload.repository.owner!.login;
    const repo = event.payload.repository.name;
    const commit = await event.octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: commitID,
    });
    await process(event.octokit, {
      source: "github",
      type: "pull_request",
      repo: {
        id: event.payload.repository.id,
        owner,
        repo,
      },
      number: event.payload.number,
      base: event.payload.pull_request.base.ref.replace("refs/heads/", ""),
      head: event.payload.pull_request.head.ref.replace("refs/heads/", ""),
      commit: {
        id: commitID,
        message: commit.data.commit.message?.substring(0, 100)!,
      },
      sender: {
        id: event.payload.sender?.id!,
        username: event.payload.sender?.login!,
      },
    });
  }
);

app.webhooks.on("push", async (event) => {
  await process(event.octokit, {
    source: "github",
    type: "push",
    repo: {
      id: event.payload.repository.id,
      owner: event.payload.repository.owner!.login,
      repo: event.payload.repository.name,
    },
    branch: event.payload.ref.replace("refs/heads/", ""),
    commit: {
      id: event.payload.head_commit?.id!,
      message: event.payload.head_commit?.message?.substring(0, 100)!,
    },
    sender: {
      id: event.payload.sender?.id!,
      username: event.payload.sender?.login!,
    },
  });
});

async function process(octokit: Octokit, trigger: Trigger) {
  const repoID = trigger.repo.id;
  const commitID = trigger.commit.id;

  // Get all apps connected to the repo
  const appRepos = await Github.listAppReposByExternalRepoID(repoID);
  const appRepoIDs = appRepos.map((x) => x.id);
  if (appRepos.length === 0) return;

  const lastEventID = await AppRepo.setLastEvent({
    appRepoIDs,
    gitContext: trigger,
  });

  // Get `sst.config.ts` file
  const file = await octokit.rest.repos.getContent({
    owner: trigger.repo.owner,
    repo: trigger.repo.repo,
    ref: commitID,
    path: "sst.config.ts",
  });
  if (!("content" in file.data)) {
    await AppRepo.setLastEventStatus({
      appRepoIDs,
      lastEventID,
      status: "sst.config.ts not found",
    });
    return;
  }

  // Parse CI config
  const sstConfig = await Run.parseSstConfig({
    content: file.data.content,
    trigger,
  });
  if ("error" in sstConfig) {
    const status =
      sstConfig.error === "parse_config"
        ? "Failed to parse sst.config.ts"
        : sstConfig.error === "evaluate_config"
        ? "Failed to evaluate sst.config.ts"
        : sstConfig.error === "v2_app"
        ? "SST v2 apps are not supported"
        : sstConfig.error === "missing_ci"
        ? "CI config not defined in sst.config.ts"
        : sstConfig.error === "missing_ci_target"
        ? "CI target not defined in sst.config.ts"
        : sstConfig.error === "missing_ci_stage"
        ? "Missing stage in CI target"
        : "Failed to parse sst.config.ts";
    await AppRepo.setLastEventStatus({ appRepoIDs, lastEventID, status });
    return;
  }

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
          await AppRepo.setLastEventStatus({
            appRepoIDs: [appRepo.id],
            lastEventID,
            status: e.message,
          });
        }
      }
    );
  }
}

export const handler = ApiHandler(async (event) => {
  const ret = await app.webhooks.verifyAndReceive({
    id: useHeader("x-github-delivery")!,
    name: useHeader("x-github-event") as any,
    signature: useHeader("x-hub-signature-256")!,
    payload: useBody()!,
  });

  console.log(useHeader("x-github-event"), event);
  return {
    statusCode: 200,
    body: "ok",
  };
});
