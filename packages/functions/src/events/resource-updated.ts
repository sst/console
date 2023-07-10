import { provideActor } from "@console/core/actor";
import { Resource } from "@console/core/app/resource";
import { Stage } from "@console/core/app/stage";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(Resource.Events.Updated, async (evt) => {
  provideActor(evt.metadata.actor);
  await Stage.syncMetadata(evt.properties.stageID);
});
