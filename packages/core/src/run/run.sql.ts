import {
  json,
  mysqlTable,
  varchar,
  foreignKey,
  text,
  mysqlEnum,
  unique,
  timestamp,
} from "drizzle-orm/mysql-core";
import { workspaceID, cuid, timestampsNext } from "../util/sql";
import { z } from "zod";
import { stage } from "../app/app.sql";
import { workspaceIndexes } from "../workspace/workspace.sql";
import { awsAccount } from "../aws/aws.sql";

export const Resource = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("lambda"),
    properties: z.object({
      role: z.string().nonempty(),
      function: z.string().nonempty(),
    }),
  }),
]);
export type Resource = z.infer<typeof Resource>;
export const Architecture = ["x86_64", "arm64"] as const;

export const Log = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("lambda"),
    requestID: z.string().nonempty(),
    logGroup: z.string().nonempty(),
    logStream: z.string().nonempty(),
  }),
]);
export type Log = z.infer<typeof Log>;

export const Trigger = z.object({
  source: z.enum(["github"]),
  type: z.enum(["push"]),
  repo: z.object({
    id: z.number(),
    owner: z.string().nonempty(),
    repo: z.string().nonempty(),
  }),
  branch: z.string().nonempty(),
  commit: z.object({
    id: z.string().nonempty(),
    message: z.string().max(100).nonempty(),
  }),
  sender: z.object({
    id: z.number(),
    username: z.string().nonempty(),
  }),
});
export type Trigger = z.infer<typeof Trigger>;

export const runRunner = mysqlTable(
  "run_runner",
  {
    ...workspaceID,
    ...timestampsNext,
    awsAccountID: cuid("aws_account_id").notNull(),
    region: varchar("region", { length: 255 }).notNull(),
    architecture: mysqlEnum("architecture", Architecture).notNull(),
    image: varchar("image", { length: 255 }).notNull(),
    resource: json("resource").$type<Resource>().notNull(),
  },
  (table) => ({
    ...workspaceIndexes(table),
    appID: foreignKey({
      name: "workspace_id_aws_account_id_fk",
      columns: [table.workspaceID, table.awsAccountID],
      foreignColumns: [awsAccount.workspaceID, awsAccount.id],
    }).onDelete("cascade"),
  })
);

export const run = mysqlTable(
  "run",
  {
    ...workspaceID,
    ...timestampsNext,
    timeStarted: timestamp("time_started"),
    timeCompleted: timestamp("time_completed"),
    stageID: cuid("stage_id").notNull(),
    log: json("log").$type<Log>(),
    trigger: json("git_context").$type<Trigger>().notNull(),
    error: text("error"),
  },
  (table) => ({
    ...workspaceIndexes(table),
    appID: foreignKey({
      name: "workspace_id_stage_id_fk",
      columns: [table.workspaceID, table.stageID],
      foreignColumns: [stage.workspaceID, stage.id],
    }).onDelete("cascade"),
  })
);
