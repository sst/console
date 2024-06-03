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
  console.log("errors", buildRet.errors);

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
      `  console.log({error:"v2"});`,
      `  process.exit(0);`,
      `}`,
      // Ensure CI is defined in the config
      `if (!mod.ci) {`,
      `  console.log({error:"no_ci"});`,
      `  process.exit(0);`,
      `}`,
      // Two use cases:
      // - "evt.trigger" defined, ie. called on git webhook to get all config
      // - "evt.stage" defined, ie. called on repo connect to get JUST runner config
      ...(evt.trigger
        ? [
            `const ciConfig = mod.ci.config?.(${JSON.stringify(evt.trigger)});`,
            `if (!ciConfig?.stage) {`,
            `  console.log({error:"no_ci_stage"});`,
            `  process.exit(0);`,
            `}`,
            `const ciRunner = mod.ci.runner({stage: ciConfig.stage});`,
            `const app = mod.app({stage: ciConfig.stage});`,
            `fs.writeFileSync("/tmp/eval-output.mjs", JSON.stringify({app, ci: { runner: ciRunner, config: ciConfig }}));`,
          ]
        : [
            `const ciRunner = mod.ci.runner({stage: "${evt.stage}"});`,
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
    throw new Error("Failed to evaluate config");
  }
  const output = await fs.readFile("/tmp/eval-output.mjs", "utf-8");
  console.log("deploy config", output);

  return JSON.parse(output);
}
