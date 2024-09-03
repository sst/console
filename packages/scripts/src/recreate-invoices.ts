import { withActor } from "@console/core/actor";
import { Billing } from "@console/core/billing";
import { useTransaction } from "@console/core/util/transaction";
import { stripe as stripeTable } from "@console/core/billing/billing.sql";
import { isNotNull } from "@console/core/drizzle";
import { stripe } from "@console/core/stripe";

// Specify the following params
const description = "Invocations Aug 1 – Sep 1, 2024";
const startDay = "2024-08-01";
const endDay = "2024-08-31";
const skipCustomers = [
  "cus_OdfI1jeU6Aqn5h",
  "cus_OSMo2IJN17w9bY",
  "cus_OSMpaLJhEkCHvs",
];

const customers = await useTransaction((tx) =>
  tx
    .select()
    .from(stripeTable)
    .where(isNotNull(stripeTable.subscriptionItemID))
    .execute()
);
for (const customer of customers) {
  if (!customer.customerID) throw new Error("CustomerID does not exist");
  if (skipCustomers.includes(customer.customerID)) continue;

  const ret = await createInvoice(customer.workspaceID, customer.customerID);
  //if (ret) break;
}

async function createInvoice(workspaceID: string, customerID: string) {
  return await withActor(
    {
      type: "system",
      properties: {
        workspaceID,
      },
    },
    async () => {
      const monthlyInvocations = await Billing.countByStartAndEndDay({
        startDay,
        endDay,
      });
      if (monthlyInvocations < 1000000) return false;

      const lines = [];
      if (monthlyInvocations > 0) {
        const quantity = Math.min(1000000, monthlyInvocations);
        lines.push({
          description: "First 1000000",
          quantity,
          price_data: {
            currency: "usd",
            unit_amount: 0,
            product: "prod_OQFhc5zhHg7jkf",
          },
        });
      }
      if (monthlyInvocations > 1000000) {
        const quantity = Math.min(9000000, monthlyInvocations - 1000000);
        lines.push({
          description: "Next 1000001 to 10000000",
          quantity,
          price_data: {
            currency: "usd",
            unit_amount_decimal: "0.002",
            product: "prod_OQFhc5zhHg7jkf",
          },
        });
      }
      if (monthlyInvocations > 10000000) {
        const quantity = monthlyInvocations - 10000000;
        lines.push({
          description: "10000001 and above",
          quantity,
          price_data: {
            currency: "usd",
            unit_amount_decimal: "0.0002",
            product: "prod_OQFhc5zhHg7jkf",
          },
        });
      }
      console.log(workspaceID, customerID, lines);
      const invoice = await stripe.invoices.create({
        collection_method: "charge_automatically",
        customer: customerID,
        description,
      });
      await stripe.invoices.addLines(invoice.id, {
        lines,
      });
      return true;
    }
  );
}
