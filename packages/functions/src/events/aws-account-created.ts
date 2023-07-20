import { provideActor } from "@console/core/actor";
import { AWS } from "@console/core/aws";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(AWS.Account.Events.Created, async (evt) => {
  provideActor(evt.metadata.actor);
  const account = await AWS.Account.fromID(evt.properties.awsAccountID);
  if (!account) {
    console.log("account not found");
    return;
  }
  const credentials = await AWS.assumeRole(account.accountID);
  if (!credentials) return;
  await AWS.Account.integrate({
    awsAccountID: account.id,
    credentials,
  });
});
