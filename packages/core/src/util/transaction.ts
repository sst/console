import { MySqlTransaction } from "drizzle-orm/mysql-core";
import {
  PlanetScalePreparedQueryHKT,
  PlanetscaleQueryResultHKT,
} from "drizzle-orm/planetscale-serverless";
import { Context } from "sst/context";
import { db } from "../drizzle";
import { ExtractTablesWithRelations } from "drizzle-orm";

export type Transaction = MySqlTransaction<
  PlanetscaleQueryResultHKT,
  PlanetScalePreparedQueryHKT,
  Record<string, never>,
  ExtractTablesWithRelations<Record<string, never>>
>;

const TransactionContext = Context.create<{
  tx: Transaction;
  effects: (() => void | Promise<void>)[];
}>();

export async function useTransaction<T>(
  callback: (trx: Transaction) => Promise<T>
) {
  try {
    const { tx } = TransactionContext.use();
    try {
      return callback(tx);
    } catch (err) {
      throw err;
    }
  } catch {
    const effects: (() => void | Promise<void>)[] = [];
    const result = db.transaction(
      async (tx) => {
        TransactionContext.provide({ tx, effects });
        const result = await callback(tx);
        TransactionContext.reset();
        return result;
      },
      {
        isolationLevel: "serializable",
      }
    );
    await Promise.all(effects.map((x) => x()));
    return result;
  }
}

export function createTransactionEffect(effect: () => any | Promise<any>) {
  const { effects } = TransactionContext.use();
  effects.push(effect);
}
