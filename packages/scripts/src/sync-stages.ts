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
        : undefined,
      gt(stage.id, "wh3zo63vrqlfrpdaco7hekv2")
    )
  )
  .execute();
console.log("found", stages.length, "stages");
const promises = [];
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
  promises.push(
    Stage.Events.ResourcesUpdated.publish({
      stageID: stage.id,
    })
  );
}
await Promise.all(promises);

export {};
