import { withActor } from "@console/core/actor";
import { Run } from "@console/core/run";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(Run.Event.RunnerCompleted, async (evt) => {
  const { workspaceID, runID, error } = evt.properties;
  await withActor(
    {
      type: "system",
      properties: {
        workspaceID,
      },
    },
    () => Run.complete({ runID, error })
  );
});
