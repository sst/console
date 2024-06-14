import { withActor } from "@console/core/actor";
import { RunConfig } from "@console/core/run/config";
import { AppRepo } from "@console/core/app/repo";
import { AWS } from "@console/core/aws";
import { Github } from "@console/core/git/github";
import { Run } from "@console/core/run";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(RunConfig.Events.Updated, (evt) =>
  withActor(evt.metadata.actor, async () => {
    const { appID, stagePattern, awsAccountExternalID } = evt.properties;

    const appRepo = await AppRepo.getByAppID(appID);
    if (!appRepo) return;

    const gitRepo = await Github.getExternalInfoByRepoID(appRepo.repoID);
    if (!gitRepo) return;

    // Get `sst.config.ts` file from the default stage
    const content = await Github.getFile({
      installationID: gitRepo.installationID,
      owner: gitRepo.owner,
      repo: gitRepo.repo,
    });

    // Parse Autodeploy config
    const config = await Run.parseSstConfig({
      content,
      stage: stagePattern,
    });
    if ("error" in config) return;

    // Get runner (create if not exist)
    const awsAccount = await AWS.Account.fromExternalID(awsAccountExternalID);
    if (!awsAccount) return;
    const region = config.app.providers?.aws?.region ?? "us-east-1";
    const runner = await Run.lookupRunner({
      awsAccountID: awsAccount.id,
      appRepoID: appRepo.id,
      region,
      runnerConfig: config.console.autodeploy.runner,
    });

    // Assume into AWS account and region
    const credentials = await AWS.assumeRole(awsAccount?.accountID!);
    if (!credentials) return;

    if (!runner) {
      const runner = await Run.createRunner({
        appRepoID: appRepo.id,
        awsAccountID: awsAccount.id,
        awsAccountExternalID: awsAccount.accountID,
        region,
        runnerConfig: config.console.autodeploy.runner,
        credentials,
      });
      await Run.warmRunner({
        region,
        engine: runner.engine,
        resource: runner.resource,
        credentials,
        cloneUrl: await Github.getCloneUrl(gitRepo),
        instances: 1,
      });
      await Run.scheduleRunnerWarmer(runner.id);
    }
  })
);
