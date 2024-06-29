import * as fs from "fs/promises";
import { build } from "esbuild";
import { Run } from "@console/core/run";
import { spawnSync } from "child_process";

export async function handler(evt: Run.ConfigParserEvent) {
  // Decode content
  const contents = Buffer.from(evt.content, "base64").toString("utf-8");

  // Run esbuild
  await fs.rm("/tmp/sst.config.mjs", { force: true });
  const buildRet = await build({
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
    bundle: false,
    banner: {
      js: ["const $config = (input) => input;"].join("\n"),
    },
  });
  if (buildRet.errors.length) {
    console.log("errors", buildRet.errors);
    return { error: "config_build_failed" };
  }

  // Import the config
  await fs.rm("/tmp/eval.mjs", { force: true });
  await fs.rm("/tmp/eval-output.mjs", { force: true });
  await fs.writeFile(
    "/tmp/eval.mjs",
    [
      `import fs from "fs";`,
      `import mod from "./sst.config.mjs";`,
      // Ensure SST v3 app
      `if (mod.stacks || mod.config) {`,
      `  fs.writeFileSync("/tmp/eval-output.mjs", JSON.stringify({error:"config_v2_unsupported"}));`,
      `  process.exit(0);`,
      `}`,
      // Run the target function
      `const target = mod.console?.autodeploy?.target?.(${JSON.stringify(
        evt.trigger
      )});`,
      `if (mod.console?.autodeploy?.target && !target) {`,
      `  fs.writeFileSync("/tmp/eval-output.mjs", JSON.stringify({error:"config_target_returned_undefined"}));`,
      `  process.exit(0);`,
      `}`,
      `if (target && !target.stage) {`,
      `  fs.writeFileSync("/tmp/eval-output.mjs", JSON.stringify({error:"config_target_no_stage"}));`,
      `  process.exit(0);`,
      `}`,
      `const stage = target?.stage ?? "${evt.defaultStage}";`,
      `const app = mod.app({stage});`,
      `fs.writeFileSync("/tmp/eval-output.mjs", JSON.stringify({app, stage, console: { autodeploy: { target }}}));`,
    ].join("\n")
  );
  const evalRet = spawnSync("node /tmp/eval.mjs", {
    stdio: "pipe",
    shell: true,
  });
  if (evalRet.status !== 0) {
    console.log(evalRet.stdout?.toString());
    console.log(evalRet.stderr?.toString());
    return { error: "config_evaluate_failed" };
  }
  const output = await fs.readFile("/tmp/eval-output.mjs", "utf-8");
  console.log("deploy config", output);

  return JSON.parse(output);
}
