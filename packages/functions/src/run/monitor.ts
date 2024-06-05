import { withActor } from "@console/core/actor";
import { Run } from "@console/core/run";

export async function handler(evt: Run.RunTimeoutMonitorEvent) {
  const { workspaceID, runID, stateUpdateID } = evt;
  await withActor(
    {
      type: "system",
      properties: {
        workspaceID,
      },
    },
    async () => {
      await Run.completed({ runID, stateUpdateID, error: "Build timed out" });
    }
  );
}
