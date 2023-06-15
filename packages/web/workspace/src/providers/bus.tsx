import { createEmitter, createEventBus } from "@solid-primitives/event-bus";

export const bus = createEmitter<{
  poke: {
    workspaceID: string;
  };
  "log.start": {
    // timestamp
    t: number;
    // log group
    l: string;
    // requestID
    r: string;
  };
  "log.entry": {
    t: number;
    l: string;
    r: string;
    // id
    i: string;
    // kind
    k: string;
    // message
    m: string;
    // event id
  };
}>();
