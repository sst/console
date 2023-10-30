import { DateTime } from "luxon";
import {
  CloudWatchClient,
  GetMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import { EventHandler } from "sst/node/event-bus";
import { withActor, useWorkspace } from "@console/core/actor";
import { Stage } from "@console/core/app/stage";
import { Resource } from "@console/core/app/resource";
import { Billing } from "@console/core/billing";
import { stripe } from "@console/core/stripe";
import { Workspace } from "@console/core/workspace";
import { Warning } from "@console/core/warning";

export const handler = EventHandler(Stage.Events.UsageRequested, (evt) =>
  withActor(evt.metadata.actor, async () => {
    const { stageID, daysOffset } = evt.properties;
    const startDate = DateTime.now()
      .toUTC()
      .startOf("day")
      .minus({ days: daysOffset });
    const endDate = startDate.endOf("day");
    console.log("STAGE", stageID, startDate.toSQLDate(), endDate.toSQLDate());

    // Get all function resources
    const allResources = await Resource.listFromStageID({
      stageID,
      types: [
        "Function",
        "NextjsSite",
        "AstroSite",
        "RemixSite",
        "SolidStartSite",
        "SvelteKitSite",
      ],
    });
    const functions = allResources
      .filter((fn) => fn.type !== "Function" || !fn.enrichment.live)
      .map((resource) => {
        switch (resource.type) {
          case "NextjsSite":
            return resource.metadata.server;
          case "AstroSite":
            return resource.metadata.server;
          case "RemixSite":
            return resource.metadata.server;
          case "SolidStartSite":
            return resource.metadata.server;
          case "SvelteKitSite":
            return resource.metadata.server;
          case "Function":
            return resource.metadata.arn;
        }
      })
      .flatMap((item) => (item ? [item] : []))
      .map((item) => item.split(":").pop()) as string[];
    console.log(`> functions ${functions.length}/${allResources.length}`);
    if (!functions.length) return;
    console.log(functions);

    // Get stage credentials
    const config = await Stage.assumeRole(stageID);
    if (!config) return;

    // Get usage
    let invocations: number;
    try {
      invocations = await queryUsageFromAWS();
    } catch (e: any) {
      if (e.name === "AccessDenied") {
        console.error(e);
        return;
      }
      throw e;
    }

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

      const queryBatch = async (batch: typeof functions) => {
        try {
          const metrics = await client.send(
            new GetMetricDataCommand({
              MetricDataQueries: batch.map((fn, i) => ({
                Id: `m${i}`,
                MetricStat: {
                  Metric: {
                    Namespace: "AWS/Lambda",
                    MetricName: "Invocations",
                    Dimensions: [
                      {
                        Name: "FunctionName",
                        Value: fn,
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
          await Warning.remove({
            stageID: evt.properties.stageID,
            type: "permission_usage",
            target: evt.properties.stageID,
          });
          return (metrics.MetricDataResults || [])?.reduce(
            (acc, result) => acc + (result.Values?.[0] ?? 0),
            0
          );
        } catch (ex: any) {
          if (ex instanceof Error && ex.name === "AccessDenied") {
            await Warning.create({
              type: "permission_usage",
              target: evt.properties.stageID,
              data: {},
              stageID: evt.properties.stageID,
            });
            return 0;
          }
          throw ex;
        }
      };

      // Query in batches
      let total = 0;
      const chunkSize = 500;
      for (let i = 0; i < functions.length; i += chunkSize) {
        total += await queryBatch(functions.slice(i, i + chunkSize));
      }
      console.log("> invocations", total);
      return total;
    }

    async function reportUsageToStripe() {
      if (invocations === 0) return;

      const workspaceID = useWorkspace();
      const item = await Billing.Stripe.get();
      if (!item?.subscriptionItemID) return;

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
          item.subscriptionItemID,
          {
            // TODO
            quantity: monthlyInvocations,
            //quantity: 3000000,
            timestamp,
            action: "set",
          },
          {
            idempotencyKey: `${workspaceID}-${stageID}-${timestamp + 4}`,
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
  })
);
