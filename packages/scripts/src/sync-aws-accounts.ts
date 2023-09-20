import { awsAccount } from "@console/core/aws/aws.sql";
import { AWS } from "@console/core/aws";
import { withActor } from "@console/core/actor";
import { db, eq, inArray, or, sql } from "@console/core/drizzle";
import { queue } from "@console/core/util/queue";

const workspaceFilter: string[] = ["jlp4ec9lw4pfabzjwhl021oc"];

const accounts = await db
  .select()
  .from(awsAccount)
  .where(
    workspaceFilter.length
      ? inArray(awsAccount.workspaceID, workspaceFilter)
      : undefined,
  )
  .execute();

await queue(100, accounts, (account) =>
  withActor(
    {
      type: "system",
      properties: {
        workspaceID: account.workspaceID,
      },
    },
    () => AWS.Account.Events.Created.publish({ awsAccountID: account.id }),
  ),
);
