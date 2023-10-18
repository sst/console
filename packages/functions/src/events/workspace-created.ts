import { Workspace } from "@console/core/workspace";
import { stripe } from "@console/core/stripe";
import { EventHandler } from "sst/node/event-bus";
import { Issue } from "@console/core/issue";
import { withActor } from "@console/core/actor";

export const handler = EventHandler(Workspace.Events.Created, async (evt) =>
  withActor(
    {
      type: "system",
      properties: { workspaceID: evt.properties.workspaceID },
    },
    async () => {
      const workspaceID = evt.properties.workspaceID;
      const workspace = await Workspace.fromID(workspaceID);

      // await Issue.Alert.create({});

      if (workspace?.stripeCustomerID) {
        console.log("Already has stripe customer ID");
        return;
      }

      const customer = await stripe.customers.create({
        //email: evt.properties.email,
        metadata: {
          workspaceID: evt.properties.workspaceID,
        },
      });

      await Workspace.setStripeCustomerID({
        id: workspaceID,
        stripeCustomerID: customer.id,
      });
    }
  )
);
