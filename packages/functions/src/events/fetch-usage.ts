import { DateTime } from "luxon";
import {
  CloudWatchClient,
  GetMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import { provideActor } from "@console/core/actor";
import { Stage } from "@console/core/app/stage";
import { Resource } from "@console/core/app/resource";
import { Billing } from "@console/core/billing";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(
  Stage.Events.UsageRequested,
  async (evt) => {
    provideActor(evt.metadata.actor);

    const { stageID, daysOffset } = evt.properties;

    console.log("STAGE", stageID);
    const config = await Stage.assumeRole(stageID);
    if (!config.credentials) throw new Error("Failed to assume role");

    // Get all function resources
    const functions = await Resource.listFromStageID({
      stageID,
      types: ["Function"],
    });
    console.log("> functions", functions.length);

    // Get invocations for all functions
    const client = new CloudWatchClient(config);
    const startDate = DateTime.now()
      .toUTC()
      .startOf("day")
      .minus({ days: daysOffset });
    const endDate = startDate.endOf("day");
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
    console.log("> invocations", {
      startDate: startDate.toSQLDate(),
      endDate: endDate.toSQLDate(),
      invocations,
    });

    // Record usage
    await Billing.createUsage({
      stageID,
      day: startDate.toSQLDate()!,
      invocations,
    });
  }
);
