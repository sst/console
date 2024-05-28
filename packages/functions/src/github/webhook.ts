import { build } from "esbuild";
import { Github } from "@console/core/git/github";
import { Run } from "@console/core/run/run";
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
  const contents = Buffer.from(file.data.content, "base64").toString("utf-8");

  // Run esbuild
  await fs.rm("/tmp/sst.config.mjs", { force: true });
  const ret = await build({
    mainFields: ["module", "main"],
    format: "esm",
    platform: "node",
    sourcemap: "inline",
    stdin: {
      contents,
      sourcefile: "sst.config.ts",
      loader: "ts",
    },
    outfile: "/tmp/sst.config.mjs",
    write: true,
    bundle: true,
    banner: {
      js: ["const $config = (input) => input;"].join("\n"),
    },
  });
  console.log("errors", ret.errors);

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

  // Run the deploy() function
  await fs.rm("/tmp/eval.mjs", { force: true });
  await fs.rm("/tmp/eval-output.mjs", { force: true });
  await fs.writeFile(
    "/tmp/eval.mjs",
    [
      `import fs from "fs";`,
      `import mod from "./sst.config.mjs";`,
      `if (mod.stacks || mod.config) {`,
      `  console.log({error:"v2"});`,
      `}`,
      `if (!mod.deploy) {`,
      `  console.log({error:"no_deploy"});`,
      `}`,
      `const deployConfig = mod.deploy(${JSON.stringify(trigger)});`,
      `const appConfig = mod.app({stage: deployConfig.stage});`,
      `fs.writeFileSync("/tmp/eval-output.mjs", JSON.stringify({app: appConfig, deploy: deployConfig}));`,
    ].join("\n")
  );
  execSync("node /tmp/eval.mjs", { stdio: "inherit" });
  const output = await fs.readFile("/tmp/eval-output.mjs", "utf-8");
  console.log("deploy config", output);

  // Parse deploy config
  const config = JSON.parse(output);
  if (config.error) throw new Error(config.error);

  // Do not trigger build
  if (!config.deploy?.stage) return;

  // Loop through all apps connected to the repo
  const oauthToken = await event.octokit
    .auth({ type: "installation" })
    .then((x: any) => x.token);
  const apps = await AppRepo.listByRepo({ type: "github", repoID });
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
          appConfig: config.app,
          deployConfig: config.deploy,
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
