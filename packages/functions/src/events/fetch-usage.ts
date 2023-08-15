import { DateTime } from "luxon";
import {
  CloudWatchClient,
  GetMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import { EventHandler } from "sst/node/event-bus";
import { provideActor, useWorkspace } from "@console/core/actor";
import { Stage } from "@console/core/app/stage";
import { Resource } from "@console/core/app/resource";
import { Billing } from "@console/core/billing";
import { stripe } from "@console/core/stripe";
import { Workspace } from "@console/core/workspace";

export const handler = EventHandler(
  Stage.Events.UsageRequested,
  async (evt) => {
    provideActor(evt.metadata.actor);

    const { stageID, daysOffset } = evt.properties;
    const startDate = DateTime.now()
      .toUTC()
      .startOf("day")
      .minus({ days: daysOffset });
    const endDate = startDate.endOf("day");
    console.log("STAGE", stageID, startDate.toSQLDate(), endDate.toSQLDate());

    // Get all function resources
    const functions = await Resource.listFromStageID({
      stageID,
      types: ["Function"],
    });
    if (!functions.length) return;
    console.log("> functions", functions.length);

    // Get stage credentials
    const config = await Stage.assumeRole(stageID);
    if (!config) return;

    const invocations = await queryUsageFromAWS();
    await Billing.createUsage({
      stageID,
      day: startDate.toSQLDate()!,
      invocations,
    });
    await reportUsageToStripe();

    /////////////////
    // Functions
    /////////////////

    async function queryUsageFromAWS() {
      const client = new CloudWatchClient(config!);
      const metrics = await client.send(
        new GetMetricDataCommand({
          MetricDataQueries: functions.map((fn, i) => ({
            Id: `m${i}`,
            MetricStat: {
              Metric: {
                Namespace: "AWS/Lambda",
                MetricName: "Invocations",
                Dimensions: [
                  {
                    Name: "FunctionName",
                    // TODO: fix type
                    // @ts-expect-error
                    Value: fn?.metadata.arn.split(":").pop(),
                  },
                ],
              },
              Period: 86400,
              Stat: "Sum",
            },
          })),
          StartTime: startDate.toJSDate(),
          EndTime: endDate.toJSDate(),
        })
      );
      const invocations = (metrics.MetricDataResults || [])?.reduce(
        (acc, result) => acc + (result.Values?.[0] ?? 0),
        0
      );
      console.log("> invocations", invocations);
      return invocations;
    }

    async function reportUsageToStripe() {
      if (invocations === 0) return;

      const workspaceID = useWorkspace();
      const workspace = await Workspace.fromID(workspaceID);
      if (!workspace?.stripeSubscriptionItemID) return;

      const monthlyUsages = await Billing.listByStartAndEndDay({
        startDay: startDate.startOf("month").toSQLDate()!,
        endDay: startDate.endOf("month").toSQLDate()!,
      });
      const monthlyInvocations = monthlyUsages.reduce(
        (acc, usage) => acc + usage.invocations,
        0
      );
      console.log("> monthly invocations", monthlyInvocations);

      try {
        // TODO
        const timestamp = startDate.toUnixInteger();
        //const timestamp = Math.floor(Date.now() / 1000);
        //const timestamp = DateTime.now().plus({ month: 1 }).toUnixInteger();
        await stripe.subscriptionItems.createUsageRecord(
          workspace.stripeSubscriptionItemID,
          {
            // TODO
            quantity: monthlyInvocations,
            //quantity: 3000000,
            timestamp,
            action: "set",
          },
          {
            idempotencyKey: `${workspaceID}-${stageID}-${timestamp}`,
          }
        );
      } catch (e: any) {
        console.log(e.message);
        if (
          e.message.startsWith(
            "Cannot create the usage record with this timestamp"
          )
        ) {
          return;
        }
        throw e;
      }
    }
  }
);
