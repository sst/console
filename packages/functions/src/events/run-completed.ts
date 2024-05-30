import { withActor } from "@console/core/actor";
import { Run } from "@console/core/run/run";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(Run.Events.Completed, async (evt) => {
  const { workspaceID, runID, stateUpdateID, error } = evt.properties;
  await withActor(
    {
      type: "system",
      properties: {
        workspaceID,
      },
    },
    () => Run.completed({ runID, stateUpdateID, error })
  );
});
