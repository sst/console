import { Stage } from "@console/core/app/stage";
import { provideActor } from "@console/core/actor";

export async function handler() {
  const stages = await Stage.list();
  for (const stage of stages) {
    provideActor({
      type: "system",
      properties: {
        workspaceID: stage.workspaceID,
      },
    });
    await Stage.Events.UsageRequested.publish({
      stageID: stage.id,
      daysOffset: 1,
    });
  }
}
