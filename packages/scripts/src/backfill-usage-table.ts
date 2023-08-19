import { DateTime } from "luxon";
import { Workspace } from "@console/core/workspace";
import { Stage } from "@console/core/app/stage";
import { provideActor } from "@console/core/actor";

const now = DateTime.now();
const stages = await Stage.list();
for (const stage of stages) {
  if (
    stage.id.charAt(0) < "i" ||
    (stage.id.charAt(0) === "i" && stage.id.charAt(1) < "e")
  ) {
    continue;
  }

  provideActor({
    type: "system",
    properties: {
      workspaceID: stage.workspaceID,
    },
  });

  const workspace = await Workspace.fromID(stage.workspaceID);
  if (!workspace) continue;
  const workspaceCreatedTs = DateTime.fromSQL(workspace?.timeCreated!)
    .minus({ days: 1 })
    .toUnixInteger();

  let i = 1;
  do {
    const usageCycleStartTs = DateTime.now()
      .toUTC()
      .startOf("day")
      .minus({ days: i })
      .toUnixInteger();
    if (usageCycleStartTs < workspaceCreatedTs) break;

    await Stage.Events.UsageRequested.publish({
      stageID: stage.id,
      daysOffset: i,
    });
  } while (i++);
}
