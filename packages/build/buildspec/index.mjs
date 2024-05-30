/** @typedef {import("../../core/src/run/runner").RunnerPayload} RunnerPayload */
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
 * @param {RunnerPayload} event
 * @param {Context} context
 */
export async function handler(event, context) {
  let error;

  try {
    await publish("run.started", {
      logGroup: context.logGroupName,
      logStream: context.logStreamName,
      awsRequestId: context.awsRequestId,
    });

    const invokedAt = Date.now();
    console.log("isWarm:", isWarm);

    //  if (event.warm && isWarm) return "warmed";

    // Set working directory
    process.chdir(ROOT_PATH);
    checkout();
    const checkedOutAt = Date.now();
    console.log("checkoutDuration:", checkedOutAt - invokedAt + "ms");

    // Pnpm install
    process.chdir(REPO_PATH);
    shell("pnpm install");
    const pnpmInstalledAt = Date.now();
    console.log("pnpmDuration:", pnpmInstalledAt - checkedOutAt + "ms");

    isWarm = true;
    //if (event.warm) return "warmed";

    // Deploy
    process.chdir(REPO_PATH);
    deploy();
    const deployedAt = Date.now();
    console.log("deployDuration:", deployedAt - pnpmInstalledAt + "ms");
  } catch (e) {
    error = e.message;
  } finally {
    await publish("run.completed", { error });
  }

  function checkout() {
    const { cloneUrl, trigger } = event;

    if (fs.existsSync(REPO_PATH)) {
      process.chdir(REPO_PATH);
      shell("git reset --hard");
      shell(`git remote set-url origin ${cloneUrl}`);
      shell("git fetch");
    } else {
      shell(`git clone ${cloneUrl} ${REPO_DIR_NAME}`);
    }

    process.chdir(REPO_PATH);
    shell(`git -c advice.detachedHead=false checkout ${trigger.commit.id}`);
  }

  function deploy() {
    const { stage, credentials, stateUpdateID } = event;

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
    await eb.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: "sst.external",
            DetailType: type,
            Detail: JSON.stringify({
              properties: {
                ...payload,
                workspaceID: event.workspaceID,
                runID: event.runID,
                stateUpdateID: event.stateUpdateID,
              },
            }),
          },
        ],
      })
    );
  }
}
