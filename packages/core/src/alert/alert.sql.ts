import {
  json,
  mysqlTable,
  primaryKey,
  mysqlEnum,
} from "drizzle-orm/mysql-core";
import { timestamps, workspaceID } from "../util/sql";
import { Alert } from ".";

export const Event = ["issue", "autodeploy", "autodeploy.error"] as const;

export const alert = mysqlTable(
  "issue_alert",
  {
    ...workspaceID,
    ...timestamps,
    source: json("source").$type<Alert.Source>().notNull(),
    destination: json("destination").$type<Alert.Destination>().notNull(),
    //event: mysqlEnum("event", Event),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.workspaceID, table.id] }),
  })
);
