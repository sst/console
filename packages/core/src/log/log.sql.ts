import {
  mysqlTable,
  primaryKey,
  text,
  timestamp,
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

export const log_search = mysqlTable(
  "log_search",
  {
    ...workspaceID,
    ...timestamps,
    userID: cuid("user_id").notNull(),
    profileID: varchar("profile_id", { length: 33 }),
    stageID: cuid("stage_id").notNull(),
    logGroup: varchar("log_group", { length: 512 }).notNull(),
    timeStart: timestamp("time_start", {
      mode: "string",
    }),
    timeEnd: timestamp("time_end", {
      mode: "string",
    }),
  },
  (table) => ({
    primary: primaryKey(table.id, table.workspaceID),
  })
);
