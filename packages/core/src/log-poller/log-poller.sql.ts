import {
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { cuid, timestamps, workspaceID } from "../util/sql";

export const log_poller = mysqlTable(
  "log_poller",
  {
    ...workspaceID,
    ...timestamps,
    stageID: cuid("stage_id").notNull(),
    logGroup: varchar("log_group", { length: 512 }).notNull(),
    executionARN: text("execution_arn"),
  },
  (table) => ({
    primary: primaryKey(table.id, table.workspaceID),
    logGroup: uniqueIndex("log_group").on(
      table.workspaceID,
      table.stageID,
      table.logGroup
    ),
  })
);
