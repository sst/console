import { createEventBuilder } from "sst/node/event-bus";
import { useActor } from "./actor";

export const event = createEventBuilder({
  bus: "bus",
  metadataFn() {
    return {
      actor: useActor(),
    };
  },
});
