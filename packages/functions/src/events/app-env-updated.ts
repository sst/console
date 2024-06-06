import { withActor } from "@console/core/actor";
import { RunEnv } from "@console/core/run/env";
import { AppRepo } from "@console/core/app/repo";
import { AWS } from "@console/core/aws";
import { Github } from "@console/core/git/github";
import { Run } from "@console/core/run";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(RunEnv.Events.Updated, (evt) =>
  withActor(evt.metadata.actor, async () => {
    const { appID, stageName, key, value } = evt.properties;

    if (key !== "__AWS_ACCOUNT_ID") return;

    const appRepo = await AppRepo.getByAppID(appID);
    if (!appRepo) return;

    const gitRepo = await Github.getByRepoID(appRepo.repoID);
    if (!gitRepo) return;

    // Get `sst.config.ts` file from the default stage
    const content = await Github.getFile({
      installationID: gitRepo.installationID,
      owner: gitRepo.owner,
      repo: gitRepo.repo,
    });

    // Parse CI config
    const config = await Run.parseSstConfig({
      content,
      stage: stageName,
    } satisfies Run.ConfigParserEvent);
    console.log(config);

    // Get runner (create if not exist)
    const awsAccount = await AWS.Account.fromID(value);
    if (!awsAccount) return;
    const runner = await Run.lookupRunner({
      awsAccountID: awsAccount.id,
      appRepoID: appRepo.id,
      region: config.region,
      architecture: config.ci.runner.architecture,
      image: config.ci.runner.image,
    });

    // Assume into AWS account and region
    const credentials = await AWS.assumeRole(awsAccount?.accountID!);
    if (!credentials) return;

    if (!runner) {
      const runner = await Run.createRunner({
        awsAccountID: awsAccount.id,
        appRepoID: appRepo.id,
        region: config.region,
        architecture: config.ci.runner.architecture,
        image: config.ci.runner.image,
        credentials,
      });
      await Run.warmRunner({
        region: config.region,
        resource: runner.resource,
        credentials,
        cloneUrl: await Github.getCloneUrl(gitRepo),
        instances: 1,
      });
      await Run.scheduleRunnerWarmer(runner.id);
    }
  })
);
