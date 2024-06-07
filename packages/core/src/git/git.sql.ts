import {
  bigint,
  foreignKey,
  index,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { z } from "zod";
import { cuid, timestamps, workspaceID } from "../util/sql";

export const LastEvent = z.object({
  branch: z.string().nonempty(),
  commit: z.string().nonempty(),
});
export type LastEvent = z.infer<typeof LastEvent>;

export const githubOrg = mysqlTable(
  "github_org",
  {
    ...workspaceID,
    ...timestamps,
    orgID: bigint("org_id", { mode: "number" }).notNull(),
    login: varchar("login", { length: 255 }).notNull(),
    installationID: bigint("installation_id", { mode: "number" }).notNull(),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.workspaceID, table.id] }),
    org: uniqueIndex("org").on(table.workspaceID, table.orgID),
    installationID: index("installation_id").on(table.orgID),
  })
);

export const githubRepo = mysqlTable(
  "github_repo",
  {
    ...workspaceID,
    ...timestamps,
    githubOrgID: cuid("github_org_id").notNull(),
    repoID: bigint("repo_id", { mode: "number" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    lastEvent: json("last_event").$type<LastEvent>(),
    timeLastEvent: timestamp("time_last_event"),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.workspaceID, table.id] }),
    githubOrgID: foreignKey({
      name: "fk_github_org_id",
      columns: [table.workspaceID, table.githubOrgID],
      foreignColumns: [githubOrg.workspaceID, githubOrg.id],
    }).onDelete("cascade"),
    repoID: uniqueIndex("unique_repo_id").on(
      table.workspaceID,
      table.githubOrgID,
      table.repoID
    ),
  })
);
