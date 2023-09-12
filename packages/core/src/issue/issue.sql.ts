import {
  index,
  bigint,
  json,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";
import { cuid, timestamps, workspaceID } from "../util/sql";
import { Actor } from "../actor";
import { StackFrame } from "../log";
import { bigserial } from "drizzle-orm/pg-core";

export const issue = mysqlTable(
  "issue",
  {
    ...workspaceID,
    ...timestamps,
    stageID: cuid("stage_id").notNull(),
    error: text("error").notNull(),
    message: text("message").notNull(),
    errorID: varchar("error_id", { length: 255 }).notNull(),
    group: varchar("group", { length: 255 }).notNull(),
    stack: json("stack").$type<StackFrame[]>(),
    pointer: json("pointer").$type<{
      logGroup: string;
      logStream: string;
      timestamp: number;
    }>(),
    count: bigint("count", {
      mode: "number",
    }),
    timeResolved: timestamp("time_resolved", {
      mode: "string",
    }),
    timeSeen: timestamp("time_seen", {
      mode: "string",
    }).notNull(),
    resolver: json("resolver").$type<Actor>(),
    timeIgnored: timestamp("time_ignored", {
      mode: "string",
    }),
    ignorer: json("ignorer").$type<Actor>(),
  },
  (table) => ({
    primary: primaryKey(table.workspaceID, table.id),
    group: unique("group").on(table.workspaceID, table.stageID, table.group),
    updated: index("updated").on(table.workspaceID, table.timeUpdated),
  })
);

export const issueSubscriber = mysqlTable(
  "issue_subscriber",
  {
    ...workspaceID,
    ...timestamps,
    stageID: cuid("stage_id").notNull(),
    functionID: cuid("function_id").notNull(),
  },
  (table) => ({
    primary: primaryKey(table.workspaceID, table.stageID, table.id),
    unique: unique("unique").on(
      table.workspaceID,
      table.stageID,
      table.functionID
    ),
  })
);

export const issueCount = mysqlTable(
  "issue_count",
  {
    ...workspaceID,
    ...timestamps,
    hour: timestamp("hour", {
      mode: "string",
    }).notNull(),
    stageID: cuid("stage_id"),
    group: varchar("group", { length: 255 }).notNull(),
    count: bigint("count", { mode: "number" }).notNull(),
  },
  (table) => ({
    primary: primaryKey(table.workspaceID, table.id),
    unique: unique("unique").on(
      table.workspaceID,
      table.stageID,
      table.group,
      table.hour
    ),
  })
);
