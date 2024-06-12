import { withActor } from "@console/core/actor";
import { Run } from "@console/core/run";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(Run.Event.RunnerStarted, async (evt) => {
  const {
    workspaceID,
    engine,
    runID,
    awsRequestId,
    logGroup,
    logStream,
    timestamp,
  } = evt.properties;
  await withActor(
    {
      type: "system",
      properties: {
        workspaceID,
      },
    },
    () =>
      Run.markRunStarted({
        engine,
        runID,
        awsRequestId,
        logGroup,
        logStream,
        timestamp,
      })
  );
});
