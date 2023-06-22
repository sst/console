import { bus } from "$/providers/bus";
import { createStore, produce, reconcile } from "solid-js/store";

export const [LogStore, setLogStore] = createStore<
  Record<string, Invocation[]>
>({});

interface Invocation {
  id: string;
  start: Date;
  logs: Log[];
}

interface Log {
  timestamp: Date;
  message: string;
}

// stash log entries that come out of order before log start
const pendingEntries = new Map<string, Log[]>();

bus.on("log.start", (e) => {
  console.log(e);
  setLogStore(
    produce((state) => {
      let group = state[e.l];
      if (!group) state[e.l] = group = [];
      const pending = pendingEntries.get(e.r) || [];
      pendingEntries.delete(e.r);
      group.unshift({
        id: e.r,
        start: new Date(e.t),
        logs: pending,
      });
    })
  );
});

bus.on("log.entry", (e) => {
  setLogStore(
    produce((state) => {
      const log: Log = {
        timestamp: new Date(e.t),
        message: e.m,
      };
      let logs = state[e.l]?.find((i) => i.id === e.r)?.logs;
      if (!logs) {
        logs = pendingEntries.get(e.r);
        if (!logs) pendingEntries.set(e.r, (logs = []));
      }
      if (logs.find((l) => l.timestamp === log.timestamp)) return;
      logs.push(log);
    })
  );
});
