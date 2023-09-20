import { withActor } from "@console/core/actor";
import { and, db, inArray } from "@console/core/drizzle";
import { stage } from "@console/core/app/app.sql";
import { Stage } from "@console/core/app";
import { queue } from "@console/core/util/queue";
import { issueSubscriber } from "@console/core/issue/issue.sql";

const workspaceFilter: string[] = [];

const stages = await db
  .select()
  .from(stage)
  .where(
    and(
      workspaceFilter.length
        ? inArray(stage.workspaceID, workspaceFilter)
        : undefined,
    ),
  )
  .execute();
console.log("found", stages.length, "stages");
await db.delete(issueSubscriber).execute();
await queue(1, stages, async (stage) =>
  withActor(
    {
      type: "system",
      properties: {
        workspaceID: stage.workspaceID,
      },
    },
    () =>
      Stage.Events.ResourcesUpdated.publish({
        stageID: stage.id,
      }),
  ),
);
