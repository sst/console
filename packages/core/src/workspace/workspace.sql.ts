import {
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { timestamps, id, cuid } from "../util/sql";

export const workspace = mysqlTable(
  "workspace",
  {
    id: id.id.primaryKey(),
    ...timestamps,
    slug: varchar("slug", { length: 255 }).notNull(),
  },
  (table) => ({
    slug: uniqueIndex("slug").on(table.slug),
  })
);
