import { Workspace } from "@console/core/workspace";
import { stripe } from "@console/core/stripe";
import { useActor, useWorkspace } from "@console/core/actor";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { useApiAuth } from "src/api";
import { Config } from "sst/node/config";

export const handler = ApiHandler(async (event) => {
  // validate signature
  const body = stripe.webhooks.constructEvent(
    event.body!,
    event.headers["stripe-signature"]!,
    Config.STRIPE_WEBHOOK_SIGNING_SECRET
  );

  console.log(body.type, body);
  if (body.type === "customer.subscription.created") {
    // @ts-expect-error
    const { id: subscriptionID, customer, items } = body.data.object;
    const workspace = await Workspace.fromStripeCustomerID(customer);
    if (!workspace) {
      throw new Error("Workspace not found for customer");
    }
    if (workspace?.stripeSubscriptionID) {
      throw new Error("Workspace already has a subscription");
    }

    await Workspace.setStripeSubscription({
      id: workspace.id,
      stripeSubscriptionID: subscriptionID,
      stripeSubscriptionItemID: items.data[0].id,
    });
  } else if (body.type === "customer.subscription.updated") {
    // @ts-expect-error
    const { id: subscriptionID, customer, status } = body.data.object;
    // Set the subscription status to reflect in the UI
    console.log({ customer });
  } else if (body.type === "customer.subscription.deleted") {
    // @ts-expect-error
    const { id: subscriptionID } = body.data.object;
    await Workspace.deleteStripeSubscription(subscriptionID);
  }

  return { statusCode: 200 };
});
