import { withActor } from "@console/core/actor";
import { Stage } from "@console/core/app/stage";
import { Run } from "@console/core/run/run";
import { Runner } from "@console/core/run/runner";
import { Config } from "sst/node/config";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(Run.Events.Created, (evt) =>
  withActor(evt.metadata.actor, async () => {
    const {
      awsAccountID,
      region,
      stageID,
      runID,
      stateUpdateID,
      cloneUrl,
      trigger,
      deployConfig,
    } = evt.properties;
    const architecture = deployConfig.runner.architecture;
    const image = `${Config.IMAGE_URI}:${architecture}-1`;
    let context;

    try {
      context = "initialize runner";
      const awsConfig = await Stage.assumeRole(stageID);
      if (!awsConfig) return;

      // Get runner (create if not exist)
      context = "lookup existing runner";
      let resource = await Runner.get({
        awsAccountID,
        region,
        architecture,
        image,
      }).then((x) => x?.resource);
      context = "create runner";
      if (!resource) {
        resource = await Runner.create({
          awsAccountID,
          region,
          architecture,
          image,
          config: awsConfig,
        });
      }
      if (!resource) {
        throw new Error("Failed");
      }

      // Run runner
      context = "start runner";
      await Runner.invoke({
        runID,
        stateUpdateID,
        region,
        config: awsConfig,
        resource,
        stage: deployConfig.stage,
        cloneUrl,
        trigger,
      });
    } catch (e) {
      await Run.completed({
        runID,
        stateUpdateID,
        error: `Failed to ${context}`,
      });
      throw e;
    }
  })
);
