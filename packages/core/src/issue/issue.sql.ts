import {
  index,
  json,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";
import { cuid, id, timestamps, workspaceID } from "../util/sql";
import { StackFrame } from "../log";
import { Actor } from "../actor";

export const issue = mysqlTable(
  "issue",
  {
    ...workspaceID,
    ...timestamps,
    stageID: cuid("stage_id").notNull(),
    error: text("error").notNull(),
    message: text("message").notNull(),
    stack: json("stack").$type<StackFrame[]>().notNull(),
    group: varchar("group", { length: 255 }).notNull(),
    timeResolved: timestamp("time_resolved", {
      mode: "string",
    }),
    resolver: json("resolver").$type<Actor>().notNull(),
  },
  (table) => ({
    primary: primaryKey(table.workspaceID, table.stageID, table.id),
    group: unique("group").on(table.workspaceID, table.group),
    updated: index("updated").on(table.workspaceID, table.timeUpdated),
  })
);
