import { and, db, gt, inArray } from "@console/core/drizzle";
import { stage } from "@console/core/app/app.sql";
import { Stage } from "@console/core/app";
import { queue } from "@console/core/util/queue";
import { Issue } from "@console/core/issue";
import { withActor } from "@console/core/actor";
import { promptWorkspaces } from "./common";

const stages = await db
  .select()
  .from(stage)
  .where(inArray(stage.workspaceID, await promptWorkspaces()))
  .execute();
console.log("found", stages.length, "stages");
await queue(100, stages, async (stage) => {
  await withActor(
    {
      type: "system",
      properties: {
        workspaceID: stage.workspaceID,
      },
    },
    () =>
      Stage.Events.Updated.publish({
        stageID: stage.id,
      })
  );
});

export {};
