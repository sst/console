import { ReadTransaction } from "replicache";
import type { Usage } from "@console/core/billing";

export function list() {
  return async (tx: ReadTransaction) => {
    const result = await tx.scan({ prefix: `/usage/` }).toArray();
    return (result || []) as unknown as Usage[];
  };
}

export * as UsageStore from "./usage";
