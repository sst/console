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
    bundle: true,
    banner: {
      js: ["const $config = (input) => input;"].join("\n"),
    },
  });
  if (buildRet.errors.length) {
    console.log("errors", buildRet.errors);
    return { error: "parse_config" };
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
      `  fs.writeFileSync("/tmp/eval-output.mjs", JSON.stringify({error:"v2_app"}));`,
      `  process.exit(0);`,
      `}`,
      // Ensure CI is defined in the config
      `if (!mod.ci) {`,
      `  fs.writeFileSync("/tmp/eval-output.mjs", JSON.stringify({error:"missing_ci"}));`,
      `  process.exit(0);`,
      `}`,
      // Two use cases:
      // - "evt.trigger" defined, ie. called on git webhook to get all config
      // - "evt.stage" defined, ie. called on repo connect to get JUST runner config
      ...(evt.trigger
        ? [
            `const ciTarget = mod.ci.target?.(${JSON.stringify(evt.trigger)});`,
            `if (!ciTarget) {`,
            `  fs.writeFileSync("/tmp/eval-output.mjs", JSON.stringify({error:"missing_ci_target"}));`,
            `  process.exit(0);`,
            `}`,
            `if (!ciTarget.stage) {`,
            `  fs.writeFileSync("/tmp/eval-output.mjs", JSON.stringify({error:"missing_ci_stage"}));`,
            `  process.exit(0);`,
            `}`,
            `const ciRunner = mod.ci.runner?.({stage: ciTarget.stage});`,
            `const app = mod.app({stage: ciTarget.stage});`,
            `fs.writeFileSync("/tmp/eval-output.mjs", JSON.stringify({app, ci: { runner: ciRunner, target: ciTarget }}));`,
          ]
        : [
            `const ciRunner = mod.ci.runner?.({stage: "${evt.stage}"});`,
            `const app = mod.app({stage: "${evt.stage}"});`,
            `fs.writeFileSync("/tmp/eval-output.mjs", JSON.stringify({app, ci: { runner: ciRunner }}));`,
          ]),
    ].join("\n")
  );
  const evalRet = spawnSync("node /tmp/eval.mjs", {
    stdio: "pipe",
    shell: true,
  });
  if (evalRet.status !== 0) {
    console.log(evalRet.stdout?.toString());
    console.log(evalRet.stderr?.toString());
    return { error: "evaluate_config" };
  }
  const output = await fs.readFile("/tmp/eval-output.mjs", "utf-8");
  console.log("deploy config", output);

  return JSON.parse(output);
}
