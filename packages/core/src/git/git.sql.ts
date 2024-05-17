import {
  bigint,
  foreignKey,
  index,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { timestamps, workspaceID } from "../util/sql";

const org = {
  get orgID() {
    return bigint("org_id", { mode: "number" }).notNull();
  },
};

export const githubOrg = mysqlTable(
  "github_org",
  {
    ...workspaceID,
    ...timestamps,
    ...org,
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
    ...org,
    repoID: bigint("repo_id", { mode: "number" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.workspaceID, table.id] }),
    org: foreignKey({
      name: "github_repo_workspace_id_org_id",
      columns: [table.workspaceID, table.orgID],
      foreignColumns: [githubOrg.workspaceID, githubOrg.orgID],
    }).onDelete("cascade"),
    repo: uniqueIndex("repo").on(table.workspaceID, table.orgID, table.repoID),
  })
);
