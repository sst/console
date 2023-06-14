import { mysqlTable, primaryKey, uniqueIndex } from "drizzle-orm/mysql-core";
import { cuid, timestamps, workspaceID } from "../util/sql";

export const log_poller = mysqlTable(
  "log_poller",
  {
    ...timestamps,
    id: cuid("id").notNull().primaryKey(),
    logGroup: cuid("log_group").notNull(),
  },
  (table) => ({
    logGroup: uniqueIndex("log_group").on(table.logGroup),
  })
);

export const log_poller_subscriber = mysqlTable(
  "log_poller_subscriber",
  {
    ...workspaceID,
    ...timestamps,
    pollerID: cuid("poller_id").notNull(),
    userID: cuid("user_id").notNull(),
  },
  (table) => ({
    primary: primaryKey(table.id, table.workspaceID),
    unique: uniqueIndex("unique").on(
      table.workspaceID,
      table.userID,
      table.pollerID
    ),
  })
);
