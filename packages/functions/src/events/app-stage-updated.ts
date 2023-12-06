import { withActor } from "@console/core/actor";
import { Stage } from "@console/core/app/stage";
import { AWS } from "@console/core/aws";
import { EventHandler } from "sst/node/event-bus";

export const handlerInner = EventHandler(Stage.Events.Updated, (evt) =>
  withActor(evt.metadata.actor, async () => {
    const config = await Stage.assumeRole(evt.properties.stageID);
    if (!config) return;
    await Stage.syncMetadata(config);
  })
);

export const handler = async (evt: any) => {
  console.log(evt);
  return handlerInner(evt);
};
