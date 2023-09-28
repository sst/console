import { withActor } from "@console/core/actor";
import { Resource } from "@console/core/app/resource";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(Resource.Events.Updated, (evt) =>
  withActor(evt.metadata.actor, async () => {})
);
