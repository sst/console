import {
  bigint,
  foreignKey,
  index,
  mysqlTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { cuid, timestamps, timestampsNext, workspaceID } from "../util/sql";
import { workspaceIndexes } from "../workspace/workspace.sql";

export const githubOrgTable = mysqlTable(
  "github_organization",
  {
    ...workspaceID,
    ...timestampsNext,
    timeDisconnected: timestamp("time_disconnected"),
    externalOrgID: bigint("external_org_id", { mode: "number" }).notNull(),
    login: varchar("login", { length: 255 }).notNull(),
    installationID: bigint("installation_id", { mode: "number" }).notNull(),
  },
  (table) => ({
    ...workspaceIndexes(table),
    externalOrgID: uniqueIndex("unique_external_org_id").on(
      table.workspaceID,
      table.externalOrgID
    ),
    installationID: index("installation_id").on(table.installationID),
  })
);

export const githubRepoTable = mysqlTable(
  "github_repository",
  {
    ...workspaceID,
    ...timestampsNext,
    githubOrgID: cuid("github_org_id").notNull(),
    externalRepoID: bigint("external_repo_id", { mode: "number" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => ({
    ...workspaceIndexes(table),
    githubOrgID: foreignKey({
      columns: [table.workspaceID, table.githubOrgID],
      foreignColumns: [githubOrgTable.workspaceID, githubOrgTable.id],
    }).onDelete("cascade"),
    uniqueExternalRepoID: uniqueIndex("unique_external_repo_id").on(
      table.workspaceID,
      table.githubOrgID,
      table.externalRepoID
    ),
    externalRepoID: index("external_repo_id").on(table.externalRepoID),
  })
);

// TODO REMOVE
export const githubOrg_REMOVE = mysqlTable(
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

// TODO REMOVE
export const githubRepo_REMOVE = mysqlTable(
  "github_repo",
  {
    ...workspaceID,
    ...timestamps,
    githubOrgID: cuid("github_org_id").notNull(),
    repoID: bigint("repo_id", { mode: "number" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.workspaceID, table.id] }),
    githubOrgID: foreignKey({
      columns: [table.workspaceID, table.githubOrgID],
      foreignColumns: [githubOrgTable.workspaceID, githubOrgTable.id],
    }).onDelete("cascade"),
    repoID: uniqueIndex("unique_repo_id").on(
      table.workspaceID,
      table.githubOrgID,
      table.repoID
    ),
  })
);
