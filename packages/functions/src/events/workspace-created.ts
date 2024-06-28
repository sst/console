import { Workspace } from "@console/core/workspace";
import { stripe } from "@console/core/stripe";
import { EventHandler } from "sst/node/event-bus";
import { withActor } from "@console/core/actor";
import { Billing } from "@console/core/billing";
import { Alert } from "@console/core/alert";

export const handler = EventHandler(Workspace.Events.Created, async (evt) =>
  withActor(
    {
      type: "system",
      properties: { workspaceID: evt.properties.workspaceID },
    },
    async () => {
      await Alert.put({
        source: { app: "*", stage: "*" },
        destination: {
          type: "email",
          properties: { users: "*" },
        },
        event: "issue",
      });
      await Alert.put({
        source: { app: "*", stage: "*" },
        destination: {
          type: "email",
          properties: { users: "*" },
        },
        event: "autodeploy",
      });

      const subscription = await Billing.Stripe.get();
      if (subscription?.customerID) {
        console.log("Already has stripe customer ID");
        return;
      }

      const customer = await stripe.customers.create({
        //email: evt.properties.email,
        metadata: {
          workspaceID: evt.properties.workspaceID,
        },
      });

      await Billing.Stripe.setCustomerID(customer.id);
    }
  )
);
