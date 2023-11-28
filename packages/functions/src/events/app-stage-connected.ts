import { withActor } from "@console/core/actor";
import { Stage } from "@console/core/app/stage";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(Stage.Events.Connected, (evt) =>
  withActor(evt.metadata.actor, async () => {
    const config = await Stage.assumeRole(evt.properties.stageID);
    if (!config) return;
    await Stage.syncMetadata(config);
  })
);
