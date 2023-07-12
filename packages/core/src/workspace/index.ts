export * as Workspace from "./";

import { createSelectSchema } from "drizzle-zod";
import { workspace } from "./workspace.sql";
import { z } from "zod";
import { zod } from "../util/zod";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../drizzle";
import { eq } from "drizzle-orm";
import { useTransaction } from "../util/transaction";

export const Info = createSelectSchema(workspace, {
  id: (schema) => schema.id.cuid2(),
  slug: (schema) =>
    schema.slug
      .nonempty()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9\-]+$/),
});
export type Info = z.infer<typeof Info>;

export const create = zod(
  Info.pick({ slug: true, id: true }).partial({
    id: true,
  }),
  async (input) => {
    const id = input.id ?? createId();
    return useTransaction(async (tx) => {
      await tx.insert(workspace).values({
        id,
        slug: input.slug,
      });
      return id;
    });
  }
);

export const fromID = zod(Info.shape.id, async (id) =>
  db.transaction(async (tx) => {
    return tx
      .select()
      .from(workspace)
      .where(eq(workspace.id, id))
      .execute()
      .then((rows) => rows[0]);
  })
);
