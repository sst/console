import { withActor } from "@console/core/actor";
import { Issue } from "@console/core/issue";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(Issue.Events.IssueDetected, async (event) =>
  withActor(event.metadata.actor, async () => {
    await Promise.all([
      Issue.Alert.triggerIssue(event.properties),
      Issue.expand(event.properties),
    ]);
  })
);
