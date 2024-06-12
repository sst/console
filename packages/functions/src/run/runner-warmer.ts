import type { Context } from "aws-lambda";
import { withActor } from "@console/core/actor";
import { AWS } from "@console/core/aws";
import { Run } from "@console/core/run";
import { AppRepo } from "@console/core/app/repo";
import { Github } from "@console/core/git/github";

export async function handler(evt: Run.RunnerWarmerEvent, context: Context) {
  const { workspaceID, runnerID } = evt;
  await withActor(
    {
      type: "system",
      properties: {
        workspaceID,
      },
    },
    async () => {
      const runner = await Run.getRunnerByID(runnerID);
      if (!runner) return;
      if (!runner.resource) return;

      // If runner is not active, stop warming.
      // Note: Except for the case where the runner is created but has not been used.
      //       In this case, we want to warm it so that it can be used immediately.
      const usage = await Run.getRunnerActiveUsage(runnerID);
      if (!usage.length && runner.timeRun) {
        await Run.unsetRunnerWarmer(runnerID);
        return;
      }

      // Build cloneUrl
      const appRepo = await AppRepo.getByID(runner.appRepoID);
      if (!appRepo) return;
      const gitRepo = await Github.getByRepoID(appRepo.repoID);
      if (!gitRepo) return;
      const cloneUrl = await Github.getCloneUrl(gitRepo);

      // Warm
      const awsAccount = await AWS.Account.fromID(runner.awsAccountID);
      if (!awsAccount) return;
      const credentials = await AWS.assumeRole(awsAccount?.accountID!);
      if (!credentials) return;
      await Run.warmRunner({
        region: runner.region,
        engine: runner.engine,
        resource: runner.resource,
        credentials,
        cloneUrl,
        instances: Math.max(usage.length, 1),
      });

      // Schedule next warmer
      process.env.RUNNER_WARMER_FUNCTION_ARN = context.invokedFunctionArn;
      await Run.scheduleRunnerWarmer(runnerID);
    }
  );
}
