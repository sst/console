import { useWorkspace, withActor } from "@console/core/actor";
import { and, db, eq, inArray, or } from "@console/core/drizzle";
import { stage } from "@console/core/app/app.sql";
import { Stage } from "@console/core/app";
import { queue } from "@console/core/util/queue";
import { issueSubscriber } from "@console/core/issue/issue.sql";
import { useTransaction } from "@console/core/util/transaction";
import { warning } from "@console/core/warning/warning.sql";

const stages = await db
  .select()
  .from(stage)
  // .where(inArray(stage.workspaceID, await promptWorkspaces()))
  .execute();
console.log("found", stages.length, "stages");
await queue(100, stages, async (stage) =>
  withActor(
    {
      type: "system",
      properties: {
        workspaceID: stage.workspaceID,
      },
    },
    async () => {
      await useTransaction(async (tx) => {
        await tx
          .delete(issueSubscriber)
          .where(
            and(
              eq(issueSubscriber.workspaceID, useWorkspace()),
              eq(issueSubscriber.stageID, stage.id)
            )
          )
          .execute();
        await tx
          .delete(warning)
          .where(
            and(
              eq(warning.workspaceID, useWorkspace()),
              eq(warning.stageID, stage.id),
              or(
                eq(warning.type, "log_subscription"),
                eq(warning.type, "issue_rate_limited")
              )
            )
          )
          .execute();
      });
      console.log(stage.id);
      await Stage.Events.ResourcesUpdated.publish({
        stageID: stage.id,
      });
    }
  )
);
console.log("done");
