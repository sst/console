import {
  mysqlTable,
  varchar,
  mysqlEnum,
  foreignKey,
  json,
  boolean,
  unique,
  timestamp,
  int,
} from "drizzle-orm/mysql-core";
import { cuid, timestamps, workspaceID } from "../util/sql";
import { stage } from "../app/app.sql";
import { workspaceIndexes } from "../workspace/workspace.sql";
import { z } from "zod";

export const stateResourceTable = mysqlTable(
  "state_resource",
  {
    ...workspaceID,
    stageID: cuid("stage_id").notNull(),
    type: varchar("type", { length: 255 }).notNull(),
    urn: varchar("urn", { length: 255 }).notNull(),
    outputs: json("outputs").notNull(),
    action: mysqlEnum("action", ["created", "updated", "deleted"]).notNull(),
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

export const Source = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("cli"),
    properties: z.object({}),
  }),
  z.object({
    type: z.literal("ci"),
    properties: z.object({}),
  }),
]);
export type Source = z.infer<typeof Source>;

export const stateUpdateTable = mysqlTable(
  "state_update",
  {
    ...workspaceID,
    stageID: cuid("stage_id").notNull(),
    command: mysqlEnum("command", [
      "deploy",
      "refresh",
      "remove",
      "edit",
    ]).notNull(),
    source: json("source").$type<Source>().notNull(),
    ...timestamps,
    timeStarted: timestamp("time_started", {
      mode: "string",
    }),
    timeCompleted: timestamp("time_completed", {
      mode: "string",
    }),
    resourceDeleted: int("resource_deleted"),
    resourceCreated: int("resource_created"),
    resourceUpdated: int("resource_updated"),
    resourceSame: int("resource_same"),
    errors: int("errors"),
  },

  (table) => ({
    ...workspaceIndexes(table),
    stageID: foreignKey({
      columns: [table.workspaceID, table.stageID],
      foreignColumns: [stage.workspaceID, stage.id],
    }),
  })
);
