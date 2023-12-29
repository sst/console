import { Billing, Stripe } from "@console/core/billing";
import { withActor } from "@console/core/actor";
import { DateTime } from "luxon";

const workspaceID = "tviez52nfa0b6aerfw9wh597";
const timeTrialEnded = DateTime.utc(2030, 1, 1).toSQL({ includeOffset: false });

await withActor(
  {
    type: "system",
    properties: {
      workspaceID,
    },
  },
  async () => {
    await Stripe.grantTrial(timeTrialEnded!);
    await Billing.updateGatingStatus();
  }
);
