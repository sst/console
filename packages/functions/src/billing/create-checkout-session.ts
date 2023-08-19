import { DateTime } from "luxon";
import { Workspace } from "@console/core/workspace";
import { stripe } from "@console/core/stripe";
import { useActor, useWorkspace } from "@console/core/actor";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { useApiAuth } from "src/api";
import { Config } from "sst/node/config";

export const handler = ApiHandler(async (event) => {
  await useApiAuth();
  const body = useJsonBody();

  const workspace = await Workspace.fromID(useWorkspace());
  if (!workspace?.stripeCustomerID) {
    throw new Error("No stripe customer ID");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: Config.STRIPE_PRICE_ID,
      },
    ],
    customer: workspace?.stripeCustomerID,
    success_url: body.return_url,
    cancel_url: body.return_url,
    subscription_data: {
      proration_behavior: "none",
      billing_cycle_anchor: DateTime.now()
        .toUTC()
        .plus({ month: 1 })
        .startOf("month")
        .plus({ hour: 12 })
        .toUnixInteger(),
    },
  });

  return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
});
