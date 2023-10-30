import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { stripe } from "./billing.sql";
import { zod } from "../util/zod";
import { useTransaction } from "../util/transaction";
import { eq, and } from "drizzle-orm";
import { useWorkspace } from "../actor";
import { createId } from "@paralleldrive/cuid2";

export * as Stripe from "./stripe";

export const Info = createSelectSchema(stripe, {
  customerID: (schema) => schema.customerID.trim().nonempty(),
  subscriptionID: (schema) => schema.subscriptionID.trim().nonempty(),
  subscriptionItemID: (schema) => schema.subscriptionItemID.trim().nonempty(),
});
export type Info = z.infer<typeof Info>;

export function get() {
  return useTransaction((tx) =>
    tx
      .select()
      .from(stripe)
      .where(eq(stripe.workspaceID, useWorkspace()))
      .execute()
      .then((rows) => rows.at(0))
  );
}

export const setSubscription = zod(
  Info.pick({
    subscriptionID: true,
    subscriptionItemID: true,
  }),
  (input) =>
    useTransaction((tx) =>
      tx
        .update(stripe)
        .set({
          subscriptionID: input.subscriptionID,
          subscriptionItemID: input.subscriptionItemID,
        })
        .where(eq(stripe.workspaceID, useWorkspace()))
        .execute()
    )
);

export const setCustomerID = zod(Info.shape.customerID, (input) =>
  useTransaction((tx) =>
    tx
      .insert(stripe)
      .values({
        workspaceID: useWorkspace(),
        id: createId(),
        customerID: input,
        standing: "good",
      })
      .onDuplicateKeyUpdate({
        set: {
          customerID: input,
          standing: "good",
        },
      })
      .execute()
  )
);

export const fromCustomerID = zod(z.string(), (input) =>
  useTransaction((tx) =>
    tx
      .select()
      .from(stripe)
      .where(and(eq(stripe.customerID, input)))
      .execute()
      .then((rows) => rows.at(0))
  )
);

export const setStanding = zod(
  Info.pick({
    subscriptionID: true,
    standing: true,
  }),
  (input) =>
    useTransaction((tx) =>
      tx
        .update(stripe)
        .set({
          standing: input.standing,
        })
        .where(and(eq(stripe.subscriptionID, input.subscriptionID!)))
        .execute()
    )
);

export const removeSubscription = zod(
  z.string().nonempty(),
  (stripeSubscriptionID) =>
    useTransaction((tx) =>
      tx
        .update(stripe)
        .set({
          subscriptionItemID: null,
          subscriptionID: null,
        })
        .where(and(eq(stripe.subscriptionID, stripeSubscriptionID)))
        .execute()
    )
);
