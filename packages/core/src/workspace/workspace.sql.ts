import {
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { timestamps, id } from "../util/sql";

export const workspace = mysqlTable(
  "workspace",
  {
    ...id,
    ...timestamps,
    slug: varchar("slug", { length: 255 }).notNull(),
    // stripeCustomerID: varchar("stripe_customer_id", { length: 255 }),
    // stripeSubscriptionID: varchar("stripe_subscription_id", { length: 255 }),
    // stripeSubscriptionItemID: varchar("stripe_subscription_item_id", {
    //   length: 255,
    // }),
  },
  (table) => ({
    slug: uniqueIndex("slug").on(table.slug),
  })
);
