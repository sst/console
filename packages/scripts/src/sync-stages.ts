import { provideActor } from "@console/core/actor";
import { and, db, gt, inArray } from "@console/core/drizzle";
import { stage } from "@console/core/app/app.sql";
import { Stage } from "@console/core/app";
import { queue } from "@console/core/util/queue";
import { Issue } from "@console/core/issue";

const workspaceFilter: string[] = ["tviez52nfa0b6aerfw9wh597"];

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
  const config = await Stage.assumeRole(stage.id);
  if (!config) return;
  await Stage.Events.ResourcesUpdated.publish({
    stageID: stage.id,
  });
});

export {};
