import { stripe } from "@console/core/stripe";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { withApiAuth } from "src/api";
import { Billing } from "@console/core/billing";

export const handler = ApiHandler(
  withApiAuth(async () => {
    const body = useJsonBody();

    const item = await Billing.Stripe.get();
    if (!item?.customerID) {
      throw new Error("No stripe customer ID");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: item.customerID,
      return_url: body.return_url,
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  })
);
