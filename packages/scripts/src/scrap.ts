import {
  CloudWatchClient,
  GetMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import { withActor } from "@console/core/actor";
import { Stage } from "@console/core/app";
import { Resource } from "@console/core/app/resource";
import { DateTime } from "luxon";

await withActor(
  {
    type: "system",
    properties: {
      workspaceID: "hbrd8dwy3ij30xk0z9gbfbik",
    },
  },
  async () => {
    const evt = {
      properties: {
        stageID: "loirbywpyk7chbn4yc5irusd",
        daysOffset: 4,
      },
    };
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
    const functions = [
      ...new Set(
        allResources
          .flatMap((fn) =>
            fn.type === "Function" && !fn.enrichment.live ? [fn] : []
          )
          .map((resource) => resource.metadata.arn)
          .map((item) => item.split(":").pop())
      ),
    ] as string[];
    console.log(`> functions ${functions.length}/${allResources.length}`);
    console.log(functions);

    // Get stage credentials
    const config = await Stage.assumeRole(stageID);

    // Get usage
    let invocations: number;
    try {
      invocations = await queryUsageFromAWS();
    } catch (e: any) {
      throw e;
    }

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
        console.log(
          "metrics",
          batch[0],
          JSON.stringify(metrics.MetricDataResults?.[0]?.Values, null, 2)
        );
        return (metrics.MetricDataResults || [])?.reduce(
          (acc, result) => acc + (result.Values?.[0] ?? 0),
          0
        );
      };

      // Query in batches
      let total = 0;
      const chunkSize = 1;
      for (let i = 0; i < functions.length; i += chunkSize) {
        total += await queryBatch(functions.slice(i, i + chunkSize));
      }
      console.log("> invocations", total);
      return total;
    }
  }
);
