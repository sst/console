export * as Workspace from "./";

import { createSelectSchema } from "drizzle-zod";
import { workspace } from "./workspace.sql";
import { z } from "zod";
import { zod } from "../util/zod";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../drizzle";
import { eq } from "drizzle-orm";
import { createTransactionEffect, useTransaction } from "../util/transaction";
import { event } from "../event";
import { VisibleError } from "../util/error";
import { stripe } from "../billing/billing.sql";
import { useWorkspace } from "../actor";

export const Events = {
  Created: event("workspace.created", {
    workspaceID: z.string().nonempty(),
  }),
};

export class WorkspaceExistsError extends VisibleError {
  constructor(slug: string) {
    super(
      "workspace.slug_exists",
      `there is already a workspace named "${slug}"`
    );
  }
}

export const Info = createSelectSchema(workspace, {
  id: (schema) => schema.id.cuid2(),
  slug: (schema) =>
    schema.slug
      .trim()
      .toLowerCase()
      .nonempty()
      .min(3)
      .regex(/^[a-z0-9\-]+$/),
  // stripeCustomerID: (schema) => schema.stripeCustomerID.trim().nonempty(),
  // stripeSubscriptionID: (schema) =>
  //   schema.stripeSubscriptionID.trim().nonempty(),
  // stripeSubscriptionItemID: (schema) =>
  //   schema.stripeSubscriptionItemID.trim().nonempty(),
});
export type Info = z.infer<typeof Info>;

export const create = zod(
  Info.pick({ slug: true, id: true }).partial({
    id: true,
  }),
  (input) =>
    useTransaction(async (tx) => {
      const id = input.id ?? createId();
      const result = await tx.insert(workspace).ignore().values({
        id,
        slug: input.slug,
      });
      if (!result.rowsAffected) throw new WorkspaceExistsError(input.slug);
      await createTransactionEffect(() =>
        Events.Created.publish({
          workspaceID: id,
        })
      );
      return id;
    })
);

export const list = zod(z.void(), () =>
  useTransaction((tx) =>
    tx
      .select()
      .from(workspace)
      .execute()
      .then((rows) => rows)
  )
);

export const fromID = zod(Info.shape.id, async (id) =>
  useTransaction(async (tx) => {
    return tx
      .select()
      .from(workspace)
      .where(eq(workspace.id, id))
      .execute()
      .then((rows) => rows[0]);
  })
);
