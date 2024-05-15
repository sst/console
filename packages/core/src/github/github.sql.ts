import {
  index,
  int,
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { timestamps, workspaceID } from "../util/sql";

export const githubOrg = mysqlTable(
  "github_org",
  {
    ...workspaceID,
    ...timestamps,
    orgID: int("org_id").notNull(),
    orgSlug: varchar("org_slug", { length: 255 }).notNull(),
    installationID: int("installation_id").notNull(),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.workspaceID, table.id] }),
    org: uniqueIndex("org").on(table.workspaceID, table.orgID),
    orgID: index("org_id").on(table.orgID),
  })
);
