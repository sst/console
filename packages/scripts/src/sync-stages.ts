import { provideActor } from "@console/core/actor";
import { and, db, gt, inArray } from "@console/core/drizzle";
import { stage } from "@console/core/app/app.sql";
import { Stage } from "@console/core/app";
import { queue } from "@console/core/util/queue";

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
await queue(100, stages, async (stage) => {
  provideActor({
    type: "system",
    properties: {
      workspaceID: stage.workspaceID,
    },
  });
  await Stage.Events.Connected.publish({
    stageID: stage.id,
  });
});

export {};
