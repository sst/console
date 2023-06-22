import { bus } from "$/providers/bus";
import { createStore, produce, reconcile } from "solid-js/store";

export const [LogStore, setLogStore] = createStore<
  Record<string, Invocation[]>
>({});

interface Invocation {
  id: string;
  cold: boolean;
  error?: boolean;
  start: Date;
  end?: Date;
  duration?: number;
  logs: Log[];
}

interface Log {
  timestamp: Date;
  message: string;
}

// stash log entries that come out of order before log start
const pendingEntries = new Map<string, Log[]>();
const invocations = new Set<string>();

bus.on("log.start", (e) => {
  console.log(e);
  setLogStore(
    produce((state) => {
      if (invocations.has(e.r)) return;
      let group = state[e.l];
      if (!group) state[e.l] = group = [];
      const pending = pendingEntries.get(e.r) || [];
      pendingEntries.delete(e.r);
      group.push({
        id: e.r,
        start: new Date(e.t),
        cold: e.c,
        logs: pending,
      });
      invocations.add(e.r);
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
      const invocation = state[e.l]?.find((i) => i.id === e.r);
      let logs = invocation?.logs;
      if (!logs) {
        logs = pendingEntries.get(e.r);
        if (!logs) pendingEntries.set(e.r, (logs = []));
      }
      if (logs.find((l) => l.timestamp === log.timestamp)) return;
      logs.push(log);
      console.log(e, invocation);
      if (invocation && e.k === "ERROR") invocation.error = true;
    })
  );
});

bus.on("log.end", (e) => {
  setLogStore(
    produce((state) => {
      let invocation = state[e.l]?.find((i) => i.id === e.r);
      if (!invocation) return;
      invocation.end = new Date(e.t);
    })
  );
});

bus.on("log.report", (e) => {
  setLogStore(
    produce((state) => {
      let invocation = state[e.l]?.find((i) => i.id === e.r);
      if (!invocation) return;
      invocation.duration = e.d;
    })
  );
});
