import { Stripe } from "stripe";
import { Config } from "sst/node/config";

export const stripe = new Stripe(Config.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});
