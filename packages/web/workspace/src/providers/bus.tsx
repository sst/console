import { createEmitter, createEventBus } from "@solid-primitives/event-bus";

export const bus = createEmitter<{
  poke: {
    workspaceID: string;
  };
  "log.end": {
    // timestamp
    t: number;
    // log group
    l: string;
    // requestID
    r: string;
  };
  "log.start": {
    // timestamp
    t: number;
    // log group
    l: string;
    // requestID
    r: string;
    // cold
    c: boolean;
  };
  "log.report": {
    // timestamp
    t: number;
    // log group
    l: string;
    // requestID
    r: string;
    // duration
    d: number;
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
