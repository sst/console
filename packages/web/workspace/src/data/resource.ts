import { ReadTransaction } from "replicache";
import type { Resource } from "@console/core/app/resource";

export function list() {
  return async (tx: ReadTransaction) => {
    const result = await tx.scan({ prefix: `/resource/` }).toArray();
    return (result || []) as unknown as Resource.Info[];
  };
}

export function fromID(id: string) {
  return async (tx: ReadTransaction) => {
    const result = await tx.get(`/resource/${id}`);
    return result as Resource.Info;
  };
}

export function forStage(stageID: string) {
  return async (tx: ReadTransaction) => {
    const all = await list()(tx);
    return all.filter((item) => item.stageID === stageID);
  };
}

export * as ResourceStore from "./resource";
