import { awsAccount } from "@console/core/aws/aws.sql";
import { AWS } from "@console/core/aws";
import { provideActor } from "@console/core/actor";
import { db, eq, inArray, or, sql } from "@console/core/drizzle";

const workspaceFilter: string[] = ["joftdif747pvaikdh2esjlzp"];

const accounts = await db
  .select()
  .from(awsAccount)
  .where(
    workspaceFilter.length
      ? inArray(awsAccount.workspaceID, workspaceFilter)
      : undefined,
  )
  .execute();

const promises = [];
for (const account of accounts) {
  provideActor({
    type: "system",
    properties: {
      workspaceID: account.workspaceID,
    },
  });
  console.log(account.workspaceID, account.accountID);
  promises.push(
    AWS.Account.Events.Created.publish({
      awsAccountID: account.id,
    }),
  );
}
console.log(await Promise.all(promises));
