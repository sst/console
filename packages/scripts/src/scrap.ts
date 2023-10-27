import { db, eq, isNull, sql } from "@console/core/drizzle";
import { queue } from "@console/core/util/queue";
import { workspace } from "@console/core/workspace/workspace.sql";
import { useWorkspace, withActor } from "@console/core/actor";
import { issueAlert } from "@console/core/issue/issue.sql";
import { createId } from "@console/core/util/sql";

const workspaces = await db
  .select({
    id: workspace.id,
  })
  .from(workspace)
  .leftJoin(issueAlert, eq(issueAlert.workspaceID, workspace.id))
  .where(isNull(issueAlert.id))
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
      await db.insert(issueAlert).values({
        id: createId(),
        workspaceID: useWorkspace(),
        source: {
          stage: "*",
          app: "*",
        },
        destination: {
          type: "email",
          properties: {
            users: "*",
          },
        },
      });
      console.log(workspace.id);
    }
  )
);
