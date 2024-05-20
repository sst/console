import { withActor } from "@console/core/actor";
import { Stage } from "@console/core/app";
import { State } from "@console/core/state";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(State.Event.HistoryCreated, (evt) =>
  withActor(evt.metadata.actor, async () => {
    const config = await Stage.assumeRole(evt.properties.stageID);
    if (!config) return;
    await State.receiveHistory({
      key: evt.properties.key,
      config,
    });
  })
);
