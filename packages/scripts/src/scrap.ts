import { db } from "@console/core/drizzle";
import { queue } from "@console/core/util/queue";
import { workspace } from "@console/core/workspace/workspace.sql";
import { withActor } from "@console/core/actor";
import { Billing } from "@console/core/billing";

const workspaces = await db
  .select({
    id: workspace.id,
  })
  .from(workspace)
  .execute();
console.log(workspaces.length, "workspaces");

await queue(100, workspaces, async (workspace) =>
  withActor(
    {
      type: "system",
      properties: {
        workspaceID: workspace.id,
      },
    },
    async () => {
      await Billing.updateGatingStatus();
    }
  )
);
