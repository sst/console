import {
  json,
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { cuid, timestamps, workspaceID } from "../util/sql";

export const warning = mysqlTable(
  "warning",
  {
    ...workspaceID,
    ...timestamps,
    stageID: cuid("stage_id").notNull(),
    type: varchar("type", { length: 255 }).notNull(),
    target: varchar("target", { length: 255 }).notNull(),
    data: json("data"),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.workspaceID, table.id] }),
    unique: uniqueIndex("unique").on(
      table.workspaceID,
      table.stageID,
      table.type,
      table.target
    ),
  })
);
