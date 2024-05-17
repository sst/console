import { Github } from "@console/core/git/github";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(Github.Events.Installed, async (evt) => {
  await Github.syncRepos({
    installationID: evt.properties.installationID,
  });
});
