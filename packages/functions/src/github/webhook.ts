import path from "path";
import { Github } from "@console/core/git/github";
import { Run } from "@console/core/run";
import { App, Octokit } from "octokit";
import { ApiHandler, useBody, useHeader } from "sst/node/api";
import { Config } from "sst/node/config";
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
  ["pull_request.opened", "pull_request.synchronize", "pull_request.closed"],
  async (event) => {
    const commitID = event.payload.pull_request.head.sha;
    const owner = event.payload.repository.owner!.login;
    const repo = event.payload.repository.name;
    const commit = await event.octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: commitID,
    });
    await Run.create({
      octokit: event.octokit,
      trigger: {
        source: "github",
        type: "pull_request",
        action: event.payload.action === "closed" ? "removed" : "pushed",
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
      },
    });
  }
);

app.webhooks.on("push", async (event) => {
  const owner = event.payload.repository.owner!.login;
  const repo = event.payload.repository.name;
  const isTag = event.payload.ref.startsWith("refs/tags/");
  await Run.create({
    octokit: event.octokit,
    trigger: {
      source: "github",
      ...(isTag
        ? {
            type: "tag",
            tag: event.payload.ref.replace("refs/tags/", ""),
          }
        : {
            type: "branch",
            branch: event.payload.ref.replace("refs/heads/", ""),
          }),
      action: event.payload.deleted ? "removed" : "pushed",
      repo: {
        id: event.payload.repository.id,
        owner,
        repo,
      },
      commit: event.payload.deleted
        ? await (() =>
            event.octokit.rest.repos
              .getCommit({
                owner,
                repo,
                ref: event.payload.before,
              })
              .then((res) => ({
                id: event.payload.before,
                message: res.data.commit.message?.substring(0, 100)!,
              })))()
        : {
            id: event.payload.head_commit?.id!,
            message: event.payload.head_commit?.message?.substring(0, 100)!,
          },
      sender: {
        id: event.payload.sender?.id!,
        username: event.payload.sender?.login!,
      },
    },
  });
});

export const handler = ApiHandler(async (event) => {
  const ret = await app.webhooks.verifyAndReceive({
    id: useHeader("x-github-delivery")!,
    name: useHeader("x-github-event") as any,
    signature: useHeader("x-hub-signature-256")!,
    payload: useBody()!,
  });

  //console.log(useHeader("x-github-event"), event);
  return {
    statusCode: 200,
    body: "ok",
  };
});
