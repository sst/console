import { provideActor } from "@console/core/actor";
import { Stage } from "@console/core/app/stage";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(
  Stage.Events.Updated,
  async (properties, metadata) => {
    provideActor(metadata.actor);
    await Stage.syncMetadata(properties.stageID);
  }
);
