import { Stage } from "@console/core/app/stage";
import { withActor } from "@console/core/actor";

export async function handler() {
  const stages = await Stage.list();
  await Promise.all(
    stages.map((stage) =>
      withActor(
        {
          type: "system",
          properties: {
            workspaceID: stage.workspaceID,
          },
        },
        () =>
          Stage.Events.UsageRequested.publish({
            stageID: stage.id,
            daysOffset: 1,
          })
      )
    )
  );
}
