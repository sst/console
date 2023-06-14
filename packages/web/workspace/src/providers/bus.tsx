import { createEmitter, createEventBus } from "@solid-primitives/event-bus";

export const bus = createEmitter<{
  poke: {
    workspaceID: string;
  };
  log: {
    logGroup: string;
    event: any;
  };
}>();
