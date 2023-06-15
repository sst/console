import { bus } from "$/providers/bus";
import { createStore, produce, reconcile } from "solid-js/store";

export const [LogStore, setLogStore] = createStore<
  Record<
    string,
    Record<
      string,
      {
        id: string;
        start?: number;
        logs: {
          id: string;
          timestamp: number;
          message: string;
        }[];
      }
    >
  >
>();

bus.on("log.start", (e) => {
  console.log(e);
  setLogStore(
    produce((state) => {
      const group = state[e.l];
      if (!group) {
        state[e.l] = {};
      }
      if (state[e.l][e.r]) return;
      state[e.l][e.r] = {
        id: e.r,
        start: e.t,
        logs: [],
      };
    })
  );
});

bus.on("log.entry", (e) => {
  setLogStore(
    produce((state) => {
      const group = state[e.l];
      if (!group) {
        state[e.l] = {};
      }
      const entry: (typeof state)[string][string]["logs"][number] = {
        id: e.i,
        message: e.m,
        timestamp: e.t,
      };
      if (state[e.l][e.r]) {
        if (state[e.l][e.r].logs.find((l) => l.id === entry.id)) return;
        state[e.l][e.r].logs.push(entry);
        return;
      }
      state[e.l][e.r] = {
        id: e.r,
        logs: [entry],
      };
    })
  );
});
