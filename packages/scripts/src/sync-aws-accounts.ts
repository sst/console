import { awsAccount } from "@console/core/aws/aws.sql";
import { AWS } from "@console/core/aws";
import { provideActor } from "@console/core/actor";
import { db } from "@console/core/drizzle";

const accounts = await db.select().from(awsAccount).execute();

const workspaceFilter: string[] = ["b2b38s9gakw4ins2r9fasls7"];

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
