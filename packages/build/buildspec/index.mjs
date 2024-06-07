/** @typedef {import("../../core/src/run").Run.RunnerEvent} RunnerEvent */
/** @typedef {import("aws-lambda").Context} Context */
import { spawnSync } from "child_process";
import fs from "fs";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";

const ROOT_PATH = "/tmp";
const REPO_DIR_NAME = "repo";
const REPO_PATH = `${ROOT_PATH}/${REPO_DIR_NAME}`;
const eb = new EventBridgeClient({});

let isWarm = false;

/**
 * @param {RunnerEvent} event
 * @param {Context} context
 */
export async function handler(event, context) {
  console.log("isWarm:", isWarm);
  if (event.warm && isWarm) return "warmed";
  isWarm = true;

  let error;

  try {
    await publish("run.started", {
      logGroup: context.logGroupName,
      logStream: context.logStreamName,
      awsRequestId: context.awsRequestId,
      timestamp: Date.now(),
    });

    const invokedAt = Date.now();

    checkout();
    const checkedOutAt = Date.now();
    console.log("checkoutDuration:", checkedOutAt - invokedAt + "ms");

    installDependencies();
    const depsInstalledAt = Date.now();
    console.log("depsInstallDuration:", depsInstalledAt - checkedOutAt + "ms");

    if (event.warm) return "warmed";

    deploy();
    const deployedAt = Date.now();
    console.log("deployDuration:", deployedAt - depsInstalledAt + "ms");
  } catch (e) {
    error = e.message;
  } finally {
    await publish("run.completed", { error });
  }

  function checkout() {
    const { warm, cloneUrl, trigger } = event;

    // Clone or fetch the repo
    if (fs.existsSync(REPO_PATH)) {
      process.chdir(REPO_PATH);
      shell("git reset --hard");
      shell(`git remote set-url origin ${cloneUrl}`);
      shell("git fetch");
    } else {
      process.chdir(ROOT_PATH);
      shell(`git clone ${cloneUrl} ${REPO_DIR_NAME}`);
    }

    // Checkout commit
    if (!warm) {
      process.chdir(REPO_PATH);
      shell(`git -c advice.detachedHead=false checkout ${trigger.commit.id}`);
    }
  }

  function installDependencies() {
    process.chdir(REPO_PATH);

    if (fs.existsSync("yarn.lock")) shell("yarn install");
    else if (fs.existsSync("pnpm-lock.yaml")) shell("pnpm install");
    else if (fs.existsSync("bun.lockb")) shell("bun install");
    else if (fs.existsSync("package.json")) shell("npm install");
  }

  function deploy() {
    const { stage, credentials, stateUpdateID } = event;

    process.chdir(REPO_PATH);
    shell(`sst deploy --stage ${stage}`, {
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: credentials.accessKeyId,
        AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
        AWS_SESSION_TOKEN: credentials.sessionToken,
        SST_UPDATE_ID: stateUpdateID,
      },
    });
  }

  /**
   * @param {string} command
   * @param {any} options
   */
  function shell(command, options = {}) {
    console.log(`Running: ${command}`);
    const ret = spawnSync(command, {
      stdio: "inherit",
      shell: true,
      ...options,
    });

    if (ret.status !== 0) {
      throw new Error(`Failed to run: ${command}`);
    }
  }

  /**
   * @param {string} type
   * @param {any} payload
   */
  async function publish(type, payload) {
    const { warm, workspaceID, runID } = event;
    if (warm) return;

    await eb.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: "sst.external",
            DetailType: type,
            Detail: JSON.stringify({
              properties: {
                ...payload,
                workspaceID,
                runID,
              },
            }),
          },
        ],
      })
    );
  }
}
