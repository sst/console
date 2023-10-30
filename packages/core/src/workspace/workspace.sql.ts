import {
  mysqlTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { timestamps, id } from "../util/sql";
import { sql } from "drizzle-orm";

export const workspace = mysqlTable(
  "workspace",
  {
    ...id,
    ...timestamps,
    slug: varchar("slug", { length: 255 }).notNull(),
    timeGated: timestamp("time_gated", {
      mode: "string",
    }),
  },
  (table) => ({
    slug: uniqueIndex("slug").on(table.slug),
  })
);
