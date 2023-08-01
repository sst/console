import { bus } from "$/providers/bus";
import { createStore, produce, reconcile } from "solid-js/store";

export const [LogStore, setLogStore] = createStore<
  Record<string, Invocation[]>
>({});

export function clearLogStore(input: string) {
  invocations.delete(input);
  setLogStore(
    produce((state) => {
      state[input] = [];
    })
  );
}

export interface Invocation {
  id: string;
  cold: boolean;
  event?: any;
  response?: any;
  error?: {
    type: string;
    message: string;
    trace: string[];
  };
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
const invocations = new Map<string, Set<string>>();

bus.on("log", (e) => {
  for (const log of e) {
    switch (log[0]) {
      case "s": {
        const [_, timestamp, logGroup, requestId, cold] = log;
        setLogStore(
          produce((state) => {
            if (invocations.get(logGroup)?.has(requestId)) return;
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
            let set = invocations.get(logGroup);
            if (!set) invocations.set(logGroup, (set = new Set()));
            set.add(requestId);
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
            logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
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
      case "t": {
        const [_, timestamp, logGroup, requestId, type, message, trace] = log;
        setLogStore(
          produce((state) => {
            let invocation = state[logGroup]?.find((i) => i.id === requestId);
            if (!invocation) return;
            invocation.error = {
              type,
              message,
              trace,
            };
          })
        );
      }
    }
  }
});

bus.on("function.invoked", (e) => {
  bus.emit("log", [["s", Date.now(), e.functionID, e.requestID, false]]);
  setLogStore(
    produce((state) => {
      let group = state[e.functionID];
      if (!group) return;
      const invocation = group.find((i) => i.id === e.requestID);
      if (!invocation) return;
      invocation.event = e.event;
    })
  );
});

bus.on("worker.stdout", (e) => {
  bus.emit("log", [
    [
      "m",
      Date.now(),
      e.functionID,
      e.requestID,
      "INFO",
      e.message,
      Math.random().toString(),
    ],
  ]);
});

bus.on("function.success", (e) => {
  bus.emit("log", [["e", Date.now(), e.functionID, e.requestID]]);
  setLogStore(
    produce((state) => {
      let group = state[e.functionID];
      if (!group) return;
      const invocation = group.find((i) => i.id === e.requestID);
      if (!invocation) return;
      invocation.response = e.body;
    })
  );
});

bus.on("function.error", (e) => {
  bus.emit("log", [["e", Date.now(), e.functionID, e.requestID]]);
  setLogStore(
    produce((state) => {
      let group = state[e.functionID];
      if (!group) return;
      const invocation = group.find((i) => i.id === e.requestID);
      if (!invocation) return;
      invocation.error = {
        type: e.errorType,
        message: e.errorMessage,
        trace: e.trace,
      };
    })
  );
});
