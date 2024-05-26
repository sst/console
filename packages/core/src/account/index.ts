export * as Account from "./";

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { zod } from "../util/zod";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../drizzle";
import { and, eq, getTableColumns, isNull } from "drizzle-orm";
import { useTransaction } from "../util/transaction";
import { account } from "./account.sql";
import { assertActor } from "../actor";
import { workspace } from "../workspace/workspace.sql";
import { user } from "../user/user.sql";

export const Info = createSelectSchema(account, {
  id: (schema) => schema.id.cuid2(),
  email: (schema) => schema.email.trim().toLowerCase().nonempty(),
});
export type Info = z.infer<typeof Info>;

export const create = zod(
  Info.pick({ email: true, id: true }).partial({
    id: true,
  }),
  (input) =>
    useTransaction(async (tx) => {
      const id = input.id ?? createId();
      await tx.insert(account).values({
        id,
        email: input.email,
      });
      return id;
    }),
);

export const fromID = zod(Info.shape.id, async (id) =>
  db.transaction(async (tx) => {
    return tx
      .select()
      .from(account)
      .where(eq(account.id, id))
      .execute()
      .then((rows) => rows[0]);
  }),
);

export const fromEmail = zod(Info.shape.email, async (email) =>
  db.transaction(async (tx) => {
    return tx
      .select()
      .from(account)
      .where(eq(account.email, email))
      .execute()
      .then((rows) => rows[0]);
  }),
);

export function workspaces() {
  const actor = assertActor("account");
  return useTransaction((tx) =>
    tx
      .select(getTableColumns(workspace))
      .from(workspace)
      .innerJoin(user, eq(user.workspaceID, workspace.id))
      .where(
        and(
          eq(user.email, actor.properties.email),
          isNull(user.timeDeleted),
          isNull(workspace.timeDeleted),
        ),
      )
      .execute(),
  );
}
