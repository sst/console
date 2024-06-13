import { Github } from "@console/core/git/github";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(Github.Events.Installed, (evt) =>
  Github.syncRepos(evt.properties.installationID)
);
