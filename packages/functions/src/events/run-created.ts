import { withActor } from "@console/core/actor";
import { Stage } from "@console/core/app/stage";
import { Run } from "@console/core/run";
import { Resource } from "@console/core/run/run.sql";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(Run.Event.Created, (evt) =>
  withActor(evt.metadata.actor, async () => {
    const {
      awsAccountID,
      region,
      stageID,
      runID,
      stateUpdateID,
      cloneUrl,
      trigger,
      ciConfig,
    } = evt.properties;
    const architecture = ciConfig.runner.architecture;
    const image = ciConfig.runner.image;
    let context;

    try {
      context = "initialize runner";
      const awsConfig = await Stage.assumeRole(stageID);
      if (!awsConfig) return;

      // Get runner (create if not exist)
      context = "lookup existing runner";
      let runner;
      while (true) {
        runner = await Run.lookupRunner({
          awsAccountID,
          region,
          architecture,
          image,
        });
        if (!runner || runner.resource) break;
        await new Promise((resolve) => setTimeout(resolve, 5000));
        console.log("waiting for runner being created");
      }
      context = "create runner";
      if (!runner) {
        runner = await Run.createRunner({
          awsAccountID,
          region,
          architecture,
          image,
          credentials: awsConfig.credentials,
        });
      }
      if (!runner.resource) {
        throw new Error("Failed");
      }

      // Run runner
      context = "start runner";
      await Run.invokeRunner({
        runID,
        runnerID: runner.id,
        stateUpdateID,
        region,
        credentials: awsConfig.credentials,
        resource: runner.resource,
        stage: ciConfig.config.stage,
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
