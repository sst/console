import { Workspace } from "@console/core/workspace";
import { stripe } from "@console/core/stripe";
import { useActor, useWorkspace } from "@console/core/actor";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { useApiAuth } from "src/api";

export const handler = ApiHandler(async (event) => {
  await useApiAuth();
  const body = useJsonBody();

  const workspace = await Workspace.fromID(useWorkspace());
  if (!workspace?.stripeCustomerID) {
    throw new Error("No stripe customer ID");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: workspace?.stripeCustomerID,
    return_url: body.return_url,
  });

  return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
});
