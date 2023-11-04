import { db, inArray } from "@console/core/drizzle";
import { stage } from "@console/core/app/app.sql";
import { App } from "@console/core/app";
import { withActor } from "@console/core/actor";
import { promptWorkspaces } from "./common";

const stages = await db
  .select()
  .from(stage)
  .where(inArray(stage.workspaceID, await promptWorkspaces()))
  .execute();

for (const stage of stages) {
  await withActor(
    {
      type: "system",
      properties: {
        workspaceID: stage.workspaceID,
      },
    },
    () =>
      App.Stage.Events.UsageRequested.publish({
        stageID: stage.id,
        daysOffset: 1,
      })
  );
}
