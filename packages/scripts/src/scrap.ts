import { useWorkspace, withActor } from "@console/core/actor";
import { Stage } from "@console/core/app";
import { and, db, eq, or } from "@console/core/drizzle";
import { issueSubscriber } from "@console/core/issue/issue.sql";
import { Log } from "@console/core/log";
import {
  createTransaction,
  createTransactionEffect,
} from "@console/core/util/transaction";
import { warning } from "@console/core/warning/warning.sql";
import input from "inquirer/lib/prompts/input";

const stages = await db
  .select({
    stageID: warning.stageID,
    workspaceID: warning.workspaceID,
  })
  .from(warning)
  .where(eq(warning.type, "issue_rate_limited"))
  .groupBy(warning.stageID, warning.workspaceID);

for (const row of stages) {
  console.log(row);
  await withActor(
    {
      type: "system",
      properties: {
        workspaceID: row.workspaceID,
      },
    },
    async () => {
      await createTransaction(async (tx) => {
        await tx
          .delete(issueSubscriber)
          .where(
            and(
              eq(issueSubscriber.workspaceID, row.workspaceID),
              eq(issueSubscriber.stageID, row.stageID)
            )
          )
          .execute();
        await tx
          .delete(warning)
          .where(
            and(
              eq(warning.workspaceID, useWorkspace()),
              eq(warning.stageID, row.stageID),
              or(
                eq(warning.type, "log_subscription"),
                eq(warning.type, "issue_rate_limited")
              )
            )
          )
          .execute();

        await createTransactionEffect(() => {
          Stage.Events.ResourcesUpdated.publish({
            stageID: row.stageID,
          });
        });
      });
    }
  );
}
