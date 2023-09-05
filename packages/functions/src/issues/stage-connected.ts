import { provideActor } from "@console/core/actor";
import { App, Stage } from "@console/core/app";
import { Issue } from "@console/core/issue";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(App.Stage.Events.Connected, async (evt) => {
  provideActor(evt.metadata.actor);
  const config = await Stage.assumeRole(evt.properties.stageID);
  if (!config) return;
  await Issue.connectStage(config);
});
