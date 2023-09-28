import { withActor } from "@console/core/actor";
import { App, Stage } from "@console/core/app";
import { Issue } from "@console/core/issue";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(App.Stage.Events.ResourcesUpdated, (evt) =>
  withActor(evt.metadata.actor, async () => {
    const config = await Stage.assumeRole(evt.properties.stageID);
    if (!config) return;
    await Issue.subscribe(config);
  })
);
