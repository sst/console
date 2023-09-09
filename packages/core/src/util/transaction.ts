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

type TxOrDb = Transaction | typeof db;

const TransactionContext = Context.create<{
  tx: TxOrDb;
  effects: (() => void | Promise<void>)[];
}>();

export async function useTransaction<T>(callback: (trx: TxOrDb) => Promise<T>) {
  try {
    const { tx } = TransactionContext.use();
    return callback(tx);
  } catch {
    return callback(db);
  }
}

export async function createTransactionEffect(
  effect: () => any | Promise<any>
) {
  try {
    const { effects } = TransactionContext.use();
    effects.push(effect);
  } catch {
    await effect();
  }
}

export async function createTransaction<T>(
  callback: (tx: TxOrDb) => Promise<T>
) {
  try {
    const { tx } = TransactionContext.use();
    return callback(tx);
  } catch {
    const effects: (() => void | Promise<void>)[] = [];
    const result = await db.transaction(
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
