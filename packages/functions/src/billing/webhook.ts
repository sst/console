import { Workspace } from "@console/core/workspace";
import { stripe } from "@console/core/stripe";
import { ApiHandler } from "sst/node/api";
import { Config } from "sst/node/config";
import { Billing } from "@console/core/billing";
import { withActor } from "@console/core/actor";

export const handler = ApiHandler(async (event) => {
  // validate signature
  const body = stripe.webhooks.constructEvent(
    event.body!,
    event.headers["stripe-signature"]!,
    Config.STRIPE_WEBHOOK_SIGNING_SECRET
  );

  console.log(body.type, body);
  if (body.type === "customer.subscription.created") {
    const { id: subscriptionID, customer, items } = body.data.object;
    const item = await Billing.Stripe.fromCustomerID(customer as string);
    if (!item) {
      throw new Error("Workspace not found for customer");
    }
    if (item.subscriptionID) {
      throw new Error("Workspace already has a subscription");
    }

    await withActor(
      {
        type: "system",
        properties: {
          workspaceID: item.workspaceID,
        },
      },
      async () => {
        if (!items.data[0]) throw new Error("Subscription items is empty");

        await Billing.Stripe.setSubscription({
          subscriptionID,
          subscriptionItemID: items.data[0].id,
        });
        await Billing.updateGatingStatus();
      }
    );
  } else if (body.type === "customer.subscription.updated") {
    const { id: subscriptionID, customer, status } = body.data.object;

    const item = await Billing.Stripe.fromCustomerID(customer as string);
    if (!item) {
      throw new Error("Workspace not found for customer");
    }
    if (!item.subscriptionID) {
      throw new Error("Workspace does not have a subscription");
    }

    await withActor(
      {
        type: "system",
        properties: {
          workspaceID: item.workspaceID,
        },
      },
      async () => {
        if (status === "active" && item.standing === "overdue") {
          await Billing.Stripe.setStanding({
            subscriptionID,
            standing: "good",
          });
          await Billing.updateGatingStatus();
        } else if (status === "past_due" && item.standing !== "overdue") {
          await Billing.Stripe.setStanding({
            subscriptionID,
            standing: "overdue",
          });
          await Billing.updateGatingStatus();
        }
      }
    );
  } else if (body.type === "customer.subscription.deleted") {
    const { id: subscriptionID } = body.data.object;
    await Billing.Stripe.removeSubscription(subscriptionID);
    await Billing.updateGatingStatus();
  }

  // Stripe has already retried charging the customer and failed. Stripe
  // will not retry again.
  else if (body.type === "invoice.marked_uncollectible") {
    const { id, created, customer, customer_email, amount_due } =
      body.data.object;
    console.error(
      `Invoice ${amount_due} for ${customer_email} is uncollectible`,
      {
        invoice: id,
        customer,
        created: new Date(created * 1000),
      }
    );
  }

  return { statusCode: 200 };
});
