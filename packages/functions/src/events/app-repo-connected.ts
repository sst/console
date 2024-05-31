import { withActor } from "@console/core/actor";
import { AppRepo } from "@console/core/app/repo";
import { Stage } from "@console/core/app/stage";
import { Github } from "@console/core/git/github";
import { Run } from "@console/core/run";
import { Config } from "sst/node/config";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(AppRepo.Events.Connected, (evt) =>
  withActor(evt.metadata.actor, async () => {
    const { appID, repoID } = evt.properties;

    const repo = await Github.getByRepoID(repoID);
    if (!repo) return;

    // Get `sst.config.ts` file from the default stage
    const contents = await Github.getFile({
      installationID: repo.installationID,
      owner: repo.owner,
      repo: repo.repo,
    });
    console.log(contents);

    // TODO
    // - Should `runner` be on `deploy()`? Need to know what to pre-create

    // STEP 2
    //await AppRepo.runSstConfig();

    // STEP 3
    // const awsConfig = await Stage.assumeRole(stageID);
    // if (!awsConfig) return;

    // // Get runner (create if not exist)
    // const resource = await Runner.get({
    //   awsAccountID,
    //   region,
    //   architecture,
    //   image,
    // }).then((x) => x?.resource);

    // await Runner.create({
    //   awsAccountID,
    //   region,
    //   architecture,
    //   image,
    //   config: awsConfig,
    // });
  })
);
