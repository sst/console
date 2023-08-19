import { ReadTransaction, WriteTransaction } from "replicache";
import type { Workspace } from "../../../../core/src/workspace";

export function list() {
  return async (tx: ReadTransaction) => {
    const result = await tx.scan({ prefix: `/workspace/` }).toArray();
    return (result || []) as unknown as Workspace.Info[];
  };
}

export function fromSlug(slug: string) {
  return async (tx: ReadTransaction) => {
    const all = await list()(tx);
    return all.find((w) => w.slug === slug) || all[0];
  };
}

export function fromID(id: string) {
  return async (tx: ReadTransaction) => {
    const result = await tx.get(`/workspace/${id}`);
    return result as unknown as Workspace.Info;
  };
}

export function put(item: Workspace.Info) {
  return async (tx: WriteTransaction) => {
    await tx.put(`/workspace/${item.id}`, item);
  };
}

export type Info = Workspace.Info;

export * as WorkspaceStore from "./workspace";
