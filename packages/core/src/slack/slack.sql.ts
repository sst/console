import {
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { timestamps, workspaceID } from "../util/sql";

export const slackTeam = mysqlTable(
  "slack_team",
  {
    ...workspaceID,
    ...timestamps,
    teamID: varchar("team_id", { length: 255 }).notNull(),
    teamName: varchar("team_name", { length: 255 }).notNull(),
    accessToken: text("access_token").notNull(),
  },
  (table) => ({
    primary: primaryKey(table.workspaceID, table.id),
    team: uniqueIndex("team").on(table.workspaceID, table.teamID),
  })
);
