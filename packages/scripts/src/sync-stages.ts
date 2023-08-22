import { provideActor } from "@console/core/actor";
import { db, inArray } from "@console/core/drizzle";
import { stage } from "@console/core/app/app.sql";
import { Stage } from "@console/core/app";
import { workspace } from "@console/core/workspace/workspace.sql";

const workspaceFilter: string[] = [];

const stages = await db
  .select()
  .from(stage)
  .where(
    inArray(
      stage.workspaceID,
      db
        .select({
          id: workspace.id,
        })
        .from(workspace)
        .where(inArray(workspace.slug, workspaceFilter))
    )
  )
  .execute();
console.log("found", stages.length, "stages");
for (const stage of stages) {
  provideActor({
    type: "system",
    properties: {
      workspaceID: stage.workspaceID,
    },
  });
  await Stage.Events.Updated.publish({
    stageID: stage.id,
  });
}

export {};
