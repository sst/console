import { char, timestamp, datetime } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export { createId } from "@paralleldrive/cuid2";
export const cuid = (name: string) => char(name, { length: 24 });
export const id = {
  get id() {
    return cuid("id").primaryKey().notNull();
  },
};

export const workspaceID = {
  get id() {
    return cuid("id").notNull(); }, get workspaceID() {
    return cuid("workspace_id").notNull();
  },
};

export const timestamps = {
  timeCreated: timestamp("time_created", {
    mode: "string",
  })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  timeUpdated: timestamp("time_updated", {
    mode: "string",
  })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow(),
  timeDeleted: timestamp("time_deleted", {
    mode: "string",
  }),
};

import { customType } from "drizzle-orm/pg-core";

/*
const blob = <TData>(name: string) =>
  customType<{ data: TData; driverData: Buffer }>({
    dataType() {
      return "jsonb";
    },
    toDriver(value: TData): string {
      return JSON.stringify(value);
    },
  })(name);
  */
