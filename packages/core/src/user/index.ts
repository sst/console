export * as User from "./";

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { zod } from "../util/zod";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../drizzle";
import { and, eq, sql } from "drizzle-orm";
import { useTransaction } from "../util/transaction";
import { user } from "./user.sql";
import { assertActor, useWorkspace } from "../actor";

export const Info = createSelectSchema(user, {
  id: (schema) => schema.id.cuid2(),
  email: (schema) => schema.email.trim().toLowerCase().nonempty(),
  workspaceID: (schema) => schema.workspaceID.cuid2(),
});
export type Info = z.infer<typeof Info>;

export function list() {
  return useTransaction((tx) =>
    tx.select().from(user).where(eq(user.workspaceID, useWorkspace())).execute()
  );
}

export const create = zod(
  Info.pick({ email: true, id: true })
    .partial({
      id: true,
    })
    .extend({
      first: z.boolean().optional(),
    }),
  (input) =>
    useTransaction(async (tx) => {
      const id = input.id ?? createId();
      await tx
        .insert(user)
        .values({
          id,
          email: input.email,
          workspaceID: useWorkspace(),
          timeSeen: input.first ? sql`CURRENT_TIMESTAMP()` : null,
        })
        .onDuplicateKeyUpdate({
          set: {
            timeDeleted: null,
          },
        })
        .execute();
      return id;
    })
);

export const remove = zod(Info.shape.id, (input) =>
  useTransaction(async (tx) => {
    await tx
      .update(user)
      .set({
        timeDeleted: sql`CURRENT_TIMESTAMP()`,
      })
      .where(and(eq(user.id, input), eq(user.workspaceID, useWorkspace())))
      .execute();
    return input;
  })
);

export const fromID = zod(Info.shape.id, async (id) =>
  db.transaction(async (tx) => {
    return tx
      .select()
      .from(user)
      .where(and(eq(user.id, id), eq(user.workspaceID, useWorkspace())))
      .execute()
      .then((rows) => rows[0]);
  })
);

export const fromEmail = zod(Info.shape.email, async (email) =>
  db.transaction(async (tx) => {
    return tx
      .select()
      .from(user)
      .where(and(eq(user.email, email), eq(user.workspaceID, useWorkspace())))
      .execute()
      .then((rows) => rows[0]);
  })
);

export function findUser(workspaceID: string, email: string) {
  return useTransaction(async (tx) => {
    return tx
      .select()
      .from(user)
      .where(and(eq(user.email, email), eq(user.workspaceID, workspaceID)))
      .execute()
      .then((rows) => rows[0]);
  });
}
