import { ReadTransaction } from "replicache";
import type { Stage } from "@console/core/app/stage";

export function list() {
  return async (tx: ReadTransaction) => {
    const result = await tx.scan({ prefix: `/stage/` }).toArray();
    return (result || []) as unknown as Stage.Info[];
  };
}

export function fromID(id: string) {
  return async (tx: ReadTransaction) => {
    const result = await tx.get(`/stage/${id}`);
    return result as unknown as Stage.Info;
  };
}

export function forApp(appID: string) {
  return async (tx: ReadTransaction) => {
    const all = await list()(tx);
    return all.filter((stage) => stage.appID === appID);
  };
}

export function fromName(appID: string, stageName: string) {
  return async (tx: ReadTransaction) => {
    const all = await list()(tx);
    return all.find(
      (stage) => stage.appID === appID && stage.name === stageName
    );
  };
}

export * as StageStore from "./stage";
