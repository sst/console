import { bigint, char, json, mysqlTable } from "drizzle-orm/mysql-core";
import { timestamps, id } from "../util/sql";
import { Actor } from "../actor";

export const replicache_client = mysqlTable("replicache_client", {
  id: char("id", { length: 36 }).primaryKey(),
  mutationID: bigint("mutation_id", {
    mode: "number",
  })
    .default(0)
    .notNull(),
  ...timestamps,
});

export const replicache_cvr = mysqlTable("replicache_cvr", {
  ...id,
  ...timestamps,
  actor: json("actor").$type<Actor>(),
  data: json("data").$type<Record<string, string>>(),
});
