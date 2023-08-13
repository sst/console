import { awsAccount } from "@console/core/aws/aws.sql";
import { AWS } from "@console/core/aws";
import { provideActor } from "@console/core/actor";
import { db } from "@console/core/drizzle";

const accounts = await db.select().from(awsAccount).execute();

const filter: string[] = ["331093400597"];
for (const account of accounts) {
  if (filter.length && !filter.includes(account.accountID)) continue;
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
