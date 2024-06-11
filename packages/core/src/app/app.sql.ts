import {
  index,
  json,
  mysqlTable,
  primaryKey,
  uniqueIndex,
  boolean,
  varchar,
  foreignKey,
  mysqlEnum,
  bigint,
  text,
  timestamp,
} from "drizzle-orm/mysql-core";
import { timestamps, workspaceID, cuid } from "../util/sql";
import { Trigger } from "../run/run.sql";

export const app = mysqlTable(
  "app",
  {
    ...workspaceID,
    ...timestamps,
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.workspaceID, table.id] }),
    name: uniqueIndex("name").on(table.workspaceID, table.name),
    updated: index("updated").on(table.timeUpdated),
  }),
);

export const stage = mysqlTable(
  "stage",
  {
    ...workspaceID,
    ...timestamps,
    appID: cuid("app_id").notNull(),
    awsAccountID: cuid("aws_account_id").notNull(),
    region: varchar("region", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    unsupported: boolean("unsupported"),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.workspaceID, table.id] }),
    name: uniqueIndex("name").on(
      table.appID,
      table.awsAccountID,
      table.region,
      table.name,
    ),
    updated: index("updated").on(table.timeUpdated),
  }),
);

export const resource = mysqlTable(
  "resource",
  {
    ...workspaceID,
    ...timestamps,
    type: varchar("type", { length: 255 }).notNull(),
    stackID: varchar("stack_id", { length: 255 }).notNull(),
    cfnID: varchar("cfn_id", { length: 255 }).notNull(),
    constructID: varchar("construct_id", { length: 255 }),
    stageID: cuid("stage_id").notNull(),
    addr: varchar("addr", { length: 255 }).notNull(),
    metadata: json("metadata").notNull(),
    enrichment: json("enrichment").notNull(),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.workspaceID, table.id] }),
    addr: uniqueIndex("addr").on(table.workspaceID, table.stageID, table.addr),
  }),
);

export const appRepo = mysqlTable(
  "app_repo",
  {
    ...workspaceID,
    ...timestamps,
    appID: cuid("app_id").notNull(),
    type: mysqlEnum("type", ["github"]),
    repoID: bigint("repo_id", { mode: "number" }).notNull(),
    lastEvent: json("last_event").$type<Trigger>(),
    lastEventID: cuid("last_event_id"),
    lastEventStatus: text("last_event_status"),
    lastEventStateUpdateID: cuid("last_event_state_update_id"),
    timeLastEvent: timestamp("time_last_event", {
      mode: "string",
    }),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.workspaceID, table.id] }),
    appID: foreignKey({
      columns: [table.workspaceID, table.appID],
      foreignColumns: [app.workspaceID, app.id],
    }).onDelete("cascade"),
    repo: index("repo").on(table.type, table.repoID),
  }),
);
