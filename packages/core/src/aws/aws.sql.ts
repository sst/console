import {
  index,
  mysqlTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { timestamps, workspaceID } from "../util/sql";

export const awsAccount = mysqlTable(
  "aws_account",
  {
    ...workspaceID,
    ...timestamps,
    accountID: varchar("account_id", { length: 12 }).notNull(),
    timeFailed: timestamp("time_failed", {
      mode: "string",
    }),
    timeDiscovered: timestamp("time_discovered", {
      mode: "string",
    }),
  },
  (table) => ({
    primary: primaryKey(table.id, table.workspaceID),
    accountID: uniqueIndex("account_id").on(table.workspaceID, table.accountID),
    updated: index("updated").on(table.timeUpdated),
  })
);
