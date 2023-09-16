import { awsAccount } from "@console/core/aws/aws.sql";
import { AWS } from "@console/core/aws";
import { provideActor } from "@console/core/actor";
import { db, eq, inArray, or, sql } from "@console/core/drizzle";
import { queue } from "@console/core/util/queue";

const workspaceFilter: string[] = ["kzbnlviosmzv6ff2fithnde6"];

const accounts = await db
  .select()
  .from(awsAccount)
  .where(
    workspaceFilter.length
      ? inArray(awsAccount.workspaceID, workspaceFilter)
      : undefined,
  )
  .execute();

await queue(100, accounts, async (account) => {
  provideActor({
    type: "system",
    properties: {
      workspaceID: account.workspaceID,
    },
  });
  const credentials = await AWS.assumeRole(account.accountID);
  if (!credentials) return;
  await AWS.Account.integrate({
    credentials,
    awsAccountID: account.accountID,
  });
});
