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
        billing_cycle_anchor: getAnchorDate().toUnixInteger(),
      },
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  })
);

function getAnchorDate() {
  const now = DateTime.now();

  // check if falls in current month's anchor date
  // ie. Current time: Nov 1, 5am UTC
  //     Anchor date: Nov 1, 12pm UTC
  const anchor = now.toUTC().startOf("month").plus({ hour: 12 });
  if (anchor.toUnixInteger() > now.toUnixInteger()) return anchor;

  // ie. Current time: Nov 2, 5am UTC
  //     Anchor date: Dec 1, 12pm UTC
  return now.toUTC().plus({ month: 1 }).startOf("month").plus({ hour: 12 });
}
