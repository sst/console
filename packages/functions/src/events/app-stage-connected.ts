import { provideActor } from "@console/core/actor";
import { Stage } from "@console/core/app/stage";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(Stage.Events.Connected, async (evt) => {
  provideActor(evt.metadata.actor);
  const config = await Stage.assumeRole(evt.properties.stageID);
  if (!config) return;
  await Stage.syncMetadata({
    stageID: evt.properties.stageID,
    credentials: config.credentials,
  });
});
