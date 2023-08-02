import {
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { timestamps, workspaceID } from "../util/sql";

export const user = mysqlTable(
  "user",
  {
    ...workspaceID,
    ...timestamps,
    email: varchar("email", { length: 255 }).notNull(),
  },
  (table) => ({
    primary: primaryKey(table.id, table.workspaceID),
    email: uniqueIndex("email").on(table.email, table.workspaceID),
  })
);
