import { provideActor } from "@console/core/actor";
import { App } from "@console/core/app";
import { Issue } from "@console/core/issue";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(
  App.Stage.Events.ResourcesUpdated,
  async (evt) => {
    provideActor(evt.metadata.actor);
    await Issue.subscribe(evt.properties.stageID);
  }
);
