import { ReadTransaction, WriteTransaction } from "replicache";
import type { LambdaPayload } from "@console/core/lambda";

export function list() {
  return async (tx: ReadTransaction) => {
    const result = await tx.scan({ prefix: `/lambdaPayload/` }).toArray();
    return (result || []) as unknown as LambdaPayload;
  };
}

export function fromID(id: string) {
  return async (tx: ReadTransaction) => {
    const result = await tx.get(`/lambdaPayload/${id}`);
    return result as LambdaPayload;
  };
}

export function forKey(key: string) {
  return async (tx: ReadTransaction) => {
    const result = (await tx
      .scan({ prefix: `/lambdaPayload/` })
      .toArray()) as LambdaPayload[];
    return result.filter((r) => r.key === key);
  };
}

export async function remove(tx: WriteTransaction, id: LambdaPayload["id"]) {
  await tx.del(`/lambdaPayload/${id}`);
}

export async function put(
  tx: WriteTransaction,
  payload: Partial<LambdaPayload>
) {
  await tx.put(`/lambdaPayload/${payload.id}`, payload);
}

export * as LambdaPayloadStore from "./lambda-payload";
