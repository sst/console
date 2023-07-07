import { provideActor } from "@console/core/actor";
import { AWS } from "@console/core/aws";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(AWS.Account.Events.Created, async (evt) => {
  provideActor(evt.metadata.actor);
  await AWS.Account.integrate(evt.properties.awsAccountID);
});
