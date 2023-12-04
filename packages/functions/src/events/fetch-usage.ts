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
import { Warning } from "@console/core/warning";
import { uniq } from "remeda";

export const handler = EventHandler(Stage.Events.UsageRequested, (evt) =>
  withActor(evt.metadata.actor, async () => {
    const { stageID, daysOffset } = evt.properties;

    // Check if stage is unsupported
    const stage = await Stage.fromID(stageID);
    if (stage?.unsupported) return;

    const startDate = DateTime.now()
      .toUTC()
      .startOf("day")
      .minus({ days: daysOffset });
    const endDate = startDate.endOf("day");
    console.log("STAGE", stageID, startDate.toSQLDate(), endDate.toSQLDate());

    // Get all function resources
    const allResources = await Resource.listFromStageID({
      stageID,
      types: ["Function"],
    });
    const functions = uniq(
      allResources
        .flatMap((fn) =>
          fn.type === "Function" && !fn.enrichment.live ? [fn] : []
        )
        .map((resource) => resource.metadata.arn)
        .map((item) => item.split(":").pop()!)
    );
    console.log(`> functions ${functions.length}/${allResources.length}`);
    if (!functions.length) {
      await Warning.remove({
        stageID: evt.properties.stageID,
        type: "permission_usage",
        target: evt.properties.stageID,
      });
      return;
    }
    console.log(functions);

    // Get stage credentials
    const config = await Stage.assumeRole(stageID);
    if (!config) {
      console.log("cannot assume role");
      await Warning.create({
        type: "permission_usage",
        target: evt.properties.stageID,
        stageID: evt.properties.stageID,
        data: {},
      });
      return;
    }

    // Get usage
    let invocations: number;
    try {
      invocations = await queryUsageFromAWS();
      await Warning.remove({
        stageID: evt.properties.stageID,
        type: "permission_usage",
        target: evt.properties.stageID,
      });
    } catch (e: any) {
      if (e.name === "AccessDenied") {
        console.error(e);
        await Warning.create({
          type: "permission_usage",
          target: evt.properties.stageID,
          data: {},
          stageID: evt.properties.stageID,
        });
        await Billing.updateGatingStatus();
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
    await Billing.updateGatingStatus();

    /////////////////
    // Functions
    /////////////////

    async function queryUsageFromAWS() {
      const client = new CloudWatchClient(config!);

      const queryBatch = async (batch: typeof functions) => {
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
        return (metrics.MetricDataResults || [])?.reduce(
          (acc, result) => acc + (result.Values?.[0] ?? 0),
          0
        );
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

      const monthlyInvocations = await Billing.countByStartAndEndDay({
        startDay: startDate.startOf("month").toSQLDate()!,
        endDay: startDate.endOf("month").toSQLDate()!,
      });
      console.log("> monthly invocations", monthlyInvocations);

      try {
        const timestamp = endDate.toUnixInteger();
        await stripe.subscriptionItems.createUsageRecord(
          item.subscriptionItemID,
          {
            quantity: monthlyInvocations,
            timestamp,
            action: "set",
          },
          {
            idempotencyKey: `${workspaceID}-${stageID}-${timestamp}`,
          }
        );
      } catch (e: any) {
        console.log(e.message);
        // TODO: aren't there instanceof checks we can do
        if (e.message.startsWith("Keys for idempotent requests")) {
          return;
        }
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
