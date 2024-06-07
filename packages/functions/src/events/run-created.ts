import { withActor } from "@console/core/actor";
import { Stage } from "@console/core/app/stage";
import { Run } from "@console/core/run";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(Run.Event.Created, (evt) =>
  withActor(evt.metadata.actor, async () => {
    const { appID, stageID, runID } = evt.properties;

    // Wait if there are incompleted runs in the queue before the current run
    const incompletedRuns = await Run.getIncompletedRuns(stageID);
    if (incompletedRuns[0]?.id !== runID) return;

    await Run.start({ appID, stageID, runID });
  })
);
