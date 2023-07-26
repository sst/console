import {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  GetQueryResultsCommand,
  StartQueryCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { provideActor } from "@console/core/actor";
import { Stage } from "@console/core/app";
import { Log, LogEvent } from "@console/core/log";
import { Realtime } from "@console/core/realtime";
import { createId } from "@console/core/util/sql";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(Log.Events.ScanCreated, async (evt) => {
  provideActor(evt.metadata.actor);
  const input = evt.properties;
  const config = await Stage.assumeRole(input.stageID);
  const client = new CloudWatchLogsClient(config);
  console.log("scanning logs", input);

  let iteration = 0;
  const cold = new Set<string>();
  const invocations = new Set<string>();
  const response = await client.send(
    new DescribeLogStreamsCommand({
      logGroupIdentifier: input.logGroup,
      orderBy: "LastEventTime",
      descending: true,
      limit: 1,
    })
  );
  input.start = response.logStreams?.[0]?.lastEventTimestamp! + 60 * 60;
  console.log("start", new Date(input.start).toLocaleString());
  while (true) {
    iteration++;
    const start = input.start - delay(iteration);
    const end = input.start - delay(iteration - 1);
    console.log(
      "scanning from",
      new Date(start).toLocaleString(),
      "to",
      new Date(end).toLocaleString()
    );
    const result = await client.send(
      new StartQueryCommand({
        logGroupIdentifiers: [input.logGroup],
        queryString: `fields @timestamp, @message, @logStream | sort @timestamp desc | limit 1000`,
        startTime: start / 1000,
        endTime: end / 1000,
      })
    );
    console.log("created query", result.queryId);

    let processed = 0;
    while (true) {
      const response = await client.send(
        new GetQueryResultsCommand({
          queryId: result.queryId,
        })
      );

      if (response.results && response.results.length) {
        let batch: LogEvent[] = [];
        let batchSize = 0;
        for (const result of response.results.slice(processed)) {
          if (batchSize >= 100 * 1024) {
            console.log("publishing batch sized", batchSize);
            batch.sort((a, b) => b[1] - a[1]);
            await Realtime.publish("log", batch);
            batch = [];
            batchSize = 0;
          }
          const evt = Log.process({
            id: processed.toString(),
            timestamp: new Date(result[0]?.value!).getTime(),
            group: input.logGroup + "-recent",
            stream: result[2]?.value!,
            cold,
            line: result[1]?.value!,
          });
          if (evt) {
            if (evt[0] === "r") {
              console.log(evt);
              invocations.add(evt[3]);
            }
            batch.unshift(evt);
            batchSize += JSON.stringify(evt).length;
          }
          processed++;
        }
        await Realtime.publish("log", batch);
        console.log("size", invocations.size);
        if (invocations.size >= 50) return;
      }

      if (response.status === "Complete") break;

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
});

function delay(iteration: number) {
  const hours = Math.pow(2, iteration);
  return hours * 60 * 60 * 1000;
}
