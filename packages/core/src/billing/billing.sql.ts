import {
  index,
  json,
  mysqlTable,
  primaryKey,
  timestamp,
  date,
  uniqueIndex,
  varchar,
  bigint,
} from "drizzle-orm/mysql-core";
import { timestamps, workspaceID, cuid } from "../util/sql";

export const usage = mysqlTable(
  "usage",
  {
    workspaceID: workspaceID.workspaceID,
    ...timestamps,
    id: cuid("id").notNull(),
    stageID: cuid("stage_id").notNull(),
    day: date("day", { mode: "string" }).notNull(),
    invocations: bigint("invocations", { mode: "number" }).notNull(),
  },
  (table) => ({
    primary: primaryKey(table.workspaceID, table.stageID, table.day),
  })
);
