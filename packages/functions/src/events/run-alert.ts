import { withActor } from "@console/core/actor";
import { Run } from "@console/core/run";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(
  [Run.Event.Completed, Run.Event.CreateFailed],
  (evt) => withActor(evt.metadata.actor, () => Run.alert(evt.properties.runID))
);
