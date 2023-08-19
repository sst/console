import { ReadTransaction, WriteTransaction } from "replicache";
import type { Search } from "@console/core/log";

export function list() {
  return async (tx: ReadTransaction) => {
    const result = await tx.scan({ prefix: `/log_search/` }).toArray();
    return (result || []) as unknown as Search.Info[];
  };
}

export function fromID(id: string) {
  return async (tx: ReadTransaction) => {
    const result = await tx.get(`/log_search/${id}`);
    return result as Search.Info;
  };
}

export function fromLogGroup(group: string) {
  return async (tx: ReadTransaction) => {
    const result = (await tx
      .scan({ prefix: `/log_search/` })
      .toArray()) as Search.Info[];
    return result.find((r) => r.logGroup === group);
  };
}

export async function put(tx: WriteTransaction, item: Partial<Search.Info>) {
  await tx.put(`/log_search/${item.id}`, item);
}

export * as LogSearchStore from "./log-search";
