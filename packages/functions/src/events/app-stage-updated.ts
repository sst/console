import { provideActor } from "@console/core/actor";
import { EventHandler } from "./handler";
import { Stage } from "@console/core/app/stage";

export const handler = EventHandler(
  Stage.Events.Updated,
  async (properties, actor) => {
    provideActor(actor);
    await Stage.syncMetadata(properties.stageID);
  }
);
