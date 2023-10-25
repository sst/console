import { withActor } from "@console/core/actor";
import { and, db, inArray } from "@console/core/drizzle";
import { stage } from "@console/core/app/app.sql";
import { Stage } from "@console/core/app";
import { queue } from "@console/core/util/queue";
import { issueSubscriber } from "@console/core/issue/issue.sql";
import { promptWorkspaces } from "./common";

const stages = await db
  .select()
  .from(stage)
  .where(inArray(stage.workspaceID, await promptWorkspaces()))
  .execute();
console.log("found", stages.length, "stages");
await db.delete(issueSubscriber).execute();
await queue(
  20,
  stages.filter((s) => s.name === "thdxr"),
  async (stage) =>
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
        })
    )
);
console.log("done");
