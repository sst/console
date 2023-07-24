import {
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { id, timestamps } from "../util/sql";

export const account = mysqlTable(
  "account",
  {
    id: id.id.primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    ...timestamps,
  },
  (user) => ({
    email: uniqueIndex("email").on(user.email),
  })
);
