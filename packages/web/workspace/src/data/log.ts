import { bus } from "$/providers/bus";
import { createStore, produce, reconcile } from "solid-js/store";

export const [LogStore, setLogStore] = createStore<
  Record<string, Invocation[]>
>({});

export interface Invocation {
  id: string;
  cold: boolean;
  error?: boolean;
  start: Date;
  end?: Date;
  duration?: number;
  logs: Log[];
}

interface Log {
  id?: string;
  timestamp: Date;
  message: string;
}

// stash log entries that come out of order before log start
const pendingEntries = new Map<string, Log[]>();
const invocations = new Set<string>();

bus.on("log", (e) => {
  for (const log of e) {
    switch (log[0]) {
      case "s": {
        const [_, timestamp, logGroup, requestId, cold] = log;
        setLogStore(
          produce((state) => {
            if (invocations.has(requestId)) return;
            let group = state[logGroup];
            if (!group) state[logGroup] = group = [];
            const pending = pendingEntries.get(requestId) || [];
            pendingEntries.delete(requestId);
            group.push({
              id: requestId,
              start: new Date(timestamp),
              cold: cold,
              logs: pending,
            });
            invocations.add(requestId);
          })
        );
        break;
      }
      case "m": {
        const [_, timestamp, logGroup, requestId, kind, message, id] = log;
        setLogStore(
          produce((state) => {
            const log: Log = {
              id: id,
              timestamp: new Date(timestamp),
              message: message,
            };
            const invocation = state[logGroup]?.find((i) => i.id === requestId);
            let logs = invocation?.logs;
            if (!logs) {
              logs = pendingEntries.get(requestId);
              if (!logs) pendingEntries.set(requestId, (logs = []));
            }
            if (logs.find((l) => l.id === log.id)) return;
            logs.push(log);
            if (invocation && kind === "ERROR") invocation.error = true;
          })
        );
        break;
      }
      case "e": {
        const [_, timestamp, logGroup, requestId] = log;
        setLogStore(
          produce((state) => {
            let invocation = state[logGroup]?.find((i) => i.id === requestId);
            if (!invocation) return;
            invocation.end = new Date(timestamp);
          })
        );
        break;
      }
      case "r": {
        const [_, timestamp, logGroup, requestId, duration] = log;
        setLogStore(
          produce((state) => {
            let invocation = state[logGroup]?.find((i) => i.id === requestId);
            if (!invocation) return;
            invocation.duration = duration;
          })
        );
        break;
      }
    }
  }
});
