import { json, mysqlTable, primaryKey, varchar } from "drizzle-orm/mysql-core";
import { timestamps, workspaceID } from "../util/sql";
import { Actor } from "../actor";

export const lambdaPayload = mysqlTable(
  "lambda_payload",
  {
    ...workspaceID,
    ...timestamps,
    key: varchar("key", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    payload: json("payload").notNull(),
    creator: json("creator").notNull().$type<Actor>(),
  },
  (table) => ({
    primary: primaryKey(table.id, table.workspaceID),
  })
);
