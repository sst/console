import { awsAccount } from "@console/core/aws/aws.sql";
import { AWS } from "@console/core/aws";
import { withActor } from "@console/core/actor";
import { db, inArray, or } from "@console/core/drizzle";
import { queue } from "@console/core/util/queue";
import { promptWorkspaces } from "./common";
import { workspace } from "@console/core/workspace/workspace.sql";

const accounts = await db
  .select()
  .from(awsAccount)
  // .where(inArray(awsAccount.workspaceID, await promptWorkspaces()))
  .execute();

await queue(100, accounts, (account) =>
  withActor(
    {
      type: "system",
      properties: {
        workspaceID: account.workspaceID,
      },
    },
    () => AWS.Account.Events.Created.publish({ awsAccountID: account.id })
  )
);

console.log("done");
