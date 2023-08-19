import { ReadTransaction } from "replicache";
import type { LogPoller } from "@console/core/log/poller";

export function list() {
  return async (tx: ReadTransaction) => {
    const result = await tx.scan({ prefix: `/log_poller/` }).toArray();
    return (result || []) as unknown as LogPoller.Info[];
  };
}

export function fromID(id: string) {
  return async (tx: ReadTransaction) => {
    const result = await tx.get(`/log_poller/${id}`);
    return result as LogPoller.Info;
  };
}

export function fromLogGroup(group: string) {
  return async (tx: ReadTransaction) => {
    const result = (await tx
      .scan({ prefix: `/log_poller/` })
      .toArray()) as LogPoller.Info[];
    return result.find((r) => r.logGroup === group);
  };
}

export * as LogPollerStore from "./log-poller";
