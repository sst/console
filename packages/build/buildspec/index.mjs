/** @typedef {import("../../core/src/run").Run.RunnerEvent} RunnerEvent */
/** @typedef {import("aws-lambda").Context} Context */
import { spawnSync } from "child_process";
import fs from "fs";
import semver from "semver";
import { build } from "esbuild";
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
    await publish("runner.started", {
      logGroup: context.logGroupName,
      logStream: context.logStreamName,
      awsRequestId: context.awsRequestId,
      timestamp: Date.now(),
    });

    checkout();
    const sstConfig = await loadSstConfig();
    await checkSstVersion(sstConfig);
    if (event.warm) return "warmed";
    await runWorkflow(sstConfig);
  } catch (e) {
    console.error(e);
    error = e.message;
  } finally {
    await publish("runner.completed", { error });
  }

  function checkout() {
    const { warm, cloneUrl, trigger } = event;

    // Clone or fetch the repo
    if (fs.existsSync(REPO_PATH)) {
      process.chdir(REPO_PATH);
      shell("git reset --hard");
      shell(`git remote set-url origin ${cloneUrl}`);
    } else {
      process.chdir(ROOT_PATH);
      shell(`git clone --depth 1 ${cloneUrl} ${REPO_DIR_NAME}`);
    }

    // Checkout commit
    if (!warm) {
      process.chdir(REPO_PATH);
      shell(`git fetch origin ${trigger.commit.id}`);
      shell(`git -c advice.detachedHead=false checkout ${trigger.commit.id}`);
    }
  }

  async function loadSstConfig() {
    process.chdir(REPO_PATH);

    const OUTPUT_PATH = "/tmp/sst.config.mjs";
    fs.rmSync(OUTPUT_PATH, { force: true });

    const buildRet = await build({
      mainFields: ["module", "main"],
      format: "esm",
      platform: "node",
      sourcemap: "inline",
      stdin: {
        contents: fs.readFileSync("sst.config.ts", "utf8"),
        sourcefile: "sst.config.ts",
        loader: "ts",
      },
      outfile: OUTPUT_PATH,
      write: true,
      bundle: false,
      banner: {
        js: ["const $config = (input) => input;"].join("\n"),
      },
    });
    if (buildRet.errors.length) {
      console.error(buildRet.errors);
      throw new Error("Failed to load sst.config.ts");
    }

    return (await import(OUTPUT_PATH)).default;
  }

  async function checkSstVersion(sstConfig) {
    const { stage } = event;
    const semverPattern = sstConfig.app({ stage }).version;
    console.log({ semverPattern });
    if (!semverPattern) return;

    // check current version
    const installedVersion = shell("sst version", { stdio: "pipe" })
      .stdout.toString()
      .trim();
    console.log({ installedVersion });
    if (semver.satisfies(installedVersion, semverPattern)) return;

    for (let i = 1; ; i++) {
      const releases = await fetch(
        `https://api.github.com/repos/sst/ion/releases?per_page=100&page=${i}`
      ).then((res) => res.json());
      if (releases.length === 0) break;

      const release = releases.find((release) =>
        semver.satisfies(release.tag_name.replace(/^v/, ""), semverPattern)
      );
      if (release) {
        shell(`sst upgrade ${release.tag_name.replace(/^v/, "")}`);
        shell(`mv /root/.sst/bin/sst /usr/local/bin/sst`);
        break;
      }
    }
  }

  async function runWorkflow(sstConfig) {
    const { warm, stage, trigger } = event;
    if (warm) return;

    const context = {
      stage,
      trigger,
      install,
      deploy,
      remove,
      shell,
    };
    const workflow =
      sstConfig.console?.autodeploy?.workflow ??
      (async (context) => {
        install();
        context.trigger.action === "removed" ? remove() : deploy();
      });

    await workflow(context);
  }

  function install() {
    process.chdir(REPO_PATH);

    if (fs.existsSync("yarn.lock")) shell("yarn install");
    else if (fs.existsSync("pnpm-lock.yaml")) {
      shell("npm install -g pnpm");
      shell("pnpm install");
    } else if (fs.existsSync("bun.lockb")) {
      shell("npm install -g bun");
      shell("bun install");
    } else if (fs.existsSync("package.json")) shell("npm install");
  }

  function deploy() {
    const { stage, credentials, runID } = event;

    process.chdir(REPO_PATH);
    shell(`sst deploy --stage ${stage}`, {
      env: {
        AWS_ACCESS_KEY_ID: credentials.accessKeyId,
        AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
        AWS_SESSION_TOKEN: credentials.sessionToken,
        SST_AWS_NO_PROFILE: "1",
        SST_RUN_ID: runID,
      },
    });
  }

  function remove() {
    const { stage, credentials, runID } = event;

    process.chdir(REPO_PATH);
    shell(`sst remove --stage ${stage}`, {
      env: {
        AWS_ACCESS_KEY_ID: credentials.accessKeyId,
        AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
        AWS_SESSION_TOKEN: credentials.sessionToken,
        SST_AWS_NO_PROFILE: "1",
        SST_RUN_ID: runID,
      },
    });
  }

  /**
   * @param {string} command
   * @param {any} options
   */
  function shell(command, options = {}) {
    const { env } = event;

    console.log(`Running: ${command}`);
    const ret = spawnSync(command, {
      stdio: "inherit",
      shell: true,
      ...options,
      env: {
        ...process.env,
        ...env,
        ...options.env,
      },
    });

    if (ret.status !== 0) {
      throw new Error(`Failed to run: ${command}`);
    }
    return ret;
  }

  /**
   * @param {string} type
   * @param {any} payload
   */
  async function publish(type, payload) {
    const { warm, engine, workspaceID, runID } = event;
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
                engine,
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
