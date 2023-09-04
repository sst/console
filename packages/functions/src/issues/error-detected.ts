import { provideActor } from "@console/core/actor";
import { Issue } from "@console/core/issue";
import { EventHandler } from "sst/node/event-bus";
import { retry } from "@console/core/util/retry";

export const handler = EventHandler(Issue.Events.ErrorDetected, async (evt) => {
  provideActor(evt.metadata.actor);
  for (const record of evt.properties.records) {
    await retry(3, () => Issue.extract(record));
  }
});
