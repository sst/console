import {
  json,
  mysqlTable,
  primaryKey,
  mysqlEnum,
} from "drizzle-orm/mysql-core";
import { timestampsNext, workspaceID } from "../util/sql";
import { Alert } from ".";

export const Event = ["issue", "autodeploy", "autodeploy.error"] as const;
export const alert = mysqlTable(
  "issue_alert",
  {
    ...workspaceID,
    ...timestampsNext,
    source: json("source").$type<Alert.Source>().notNull(),
    destination: json("destination").$type<Alert.Destination>().notNull(),
    event: mysqlEnum("event", Event).default("issue"),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.workspaceID, table.id] }),
  })
);
