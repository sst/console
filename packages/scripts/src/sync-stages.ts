import { provideActor } from "@console/core/actor";
import { db, inArray } from "@console/core/drizzle";
import { stage } from "@console/core/app/app.sql";
import { Stage } from "@console/core/app";

const workspaceFilter: string[] = [];

const stages = await db
  .select()
  .from(stage)
  .where(
    workspaceFilter.length
      ? inArray(stage.workspaceID, workspaceFilter)
      : undefined
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
  // await Stage.Events.Updated.publish({
  //   stageID: stage.id,
  // });
  await Stage.Events.ResourcesUpdated.publish({
    stageID: stage.id,
  });
}

export {};
