import { awsAccount } from "@console/core/aws/aws.sql";
import { AWS } from "@console/core/aws";
import { provideActor } from "@console/core/actor";
import { db, eq, inArray, or, sql } from "@console/core/drizzle";

const workspaceFilter: string[] = ["w0ht67gl5u5r8mhlihddp8l2"];

const accounts = await db
  .select()
  .from(awsAccount)
  .where(
    workspaceFilter.length
      ? inArray(awsAccount.workspaceID, workspaceFilter)
      : undefined
  )
  .execute();

for (const account of accounts) {
  if (workspaceFilter.length && !workspaceFilter.includes(account.workspaceID))
    continue;
  provideActor({
    type: "system",
    properties: {
      workspaceID: account.workspaceID,
    },
  });
  await AWS.Account.Events.Created.publish({
    awsAccountID: account.id,
  });
}

export {};
