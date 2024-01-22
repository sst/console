import { createEventBuilder, ZodValidator } from "sst/node/event-bus";
import { useActor } from "./actor";

export const event = createEventBuilder({
  bus: "bus",
  validator: ZodValidator,
  metadataFn() {
    return {
      actor: useActor(),
    };
  },
});
