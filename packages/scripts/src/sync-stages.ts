import { provideActor } from "@console/core/actor";
import { and, db, gt, inArray } from "@console/core/drizzle";
import { stage } from "@console/core/app/app.sql";
import { Stage } from "@console/core/app";

const workspaceFilter: string[] = [];

const stages = await db
  .select()
  .from(stage)
  .where(
    and(
      workspaceFilter.length
        ? inArray(stage.workspaceID, workspaceFilter)
        : undefined
    )
  )
  .execute();
console.log("found", stages.length, "stages");
await Promise.all(
  stages.map((stage) => {
    provideActor({
      type: "system",
      properties: {
        workspaceID: stage.workspaceID,
      },
    });
    return Stage.Events.Connected.publish({
      stageID: stage.id,
    });
  })
);

export {};
