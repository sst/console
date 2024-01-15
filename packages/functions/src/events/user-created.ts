import { withActor } from "@console/core/actor";
import { User } from "@console/core/user";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(User.Events.UserCreated, async (event) =>
  withActor(event.metadata.actor, () =>
    User.sendEmailInvite(event.properties.userID)
  )
);
