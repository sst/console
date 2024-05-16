import {
  primaryKey,
  mysqlTable,
  varchar,
  foreignKey,
  json,
  boolean,
  unique,
  timestamp,
} from "drizzle-orm/mysql-core";
import { cuid, workspaceID } from "../util/sql";
import { stage } from "../app/app.sql";
import { workspaceIndexes } from "../workspace/workspace.sql";

export const stateResourceTable = mysqlTable(
  "state_resource",
  {
    ...workspaceID,
    stageID: cuid("stage_id").notNull(),
    type: varchar("type", { length: 255 }).notNull(),
    urn: varchar("urn", { length: 255 }).notNull(),
    outputs: json("outputs").notNull(),
    inputs: json("inputs").notNull(),
    parent: varchar("parent", { length: 255 }),
    custom: boolean("custom").notNull(),
    timeCreated: timestamp("time_created", {
      mode: "string",
    }).notNull(),
    timeUpdated: timestamp("time_updated", {
      mode: "string",
    }).notNull(),
    timeDeleted: timestamp("time_deleted", {
      mode: "string",
    }),
  },
  (table) => ({
    ...workspaceIndexes(table),
    stageID: foreignKey({
      columns: [table.workspaceID, table.stageID],
      foreignColumns: [stage.workspaceID, stage.id],
    }),
    urn: unique("urn").on(
      table.workspaceID,
      table.stageID,
      table.urn,
      table.timeUpdated
    ),
  })
);
