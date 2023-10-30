import { DateTime } from "luxon";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { withApiAuth } from "src/api";
import { Config } from "sst/node/config";
import { Billing } from "@console/core/billing";
import { stripe } from "@console/core/stripe";

export const handler = ApiHandler(
  withApiAuth(async () => {
    const body = useJsonBody();

    const item = await Billing.Stripe.get();
    if (!item?.customerID) {
      throw new Error("No stripe customer ID");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: Config.STRIPE_PRICE_ID,
        },
      ],
      customer: item.customerID,
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
  })
);
