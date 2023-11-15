import { withActor } from "@console/core/actor";
import { AWS } from "@console/core/aws";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(AWS.Account.Events.Created, (evt) =>
  withActor(evt.metadata.actor, async () => {
    await AWS.Account.disconnect(evt.properties.awsAccountID);
  })
);
