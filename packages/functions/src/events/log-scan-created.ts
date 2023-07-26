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
import {
  flatMap,
  flatten,
  groupBy,
  map,
  mapValues,
  pipe,
  sort,
  values,
} from "remeda";
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
  console.log(response.logStreams);
  input.start = response.logStreams?.[0]?.lastEventTimestamp! + 30 * 60 * 1000;
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
    const result = await client
      .send(
        new StartQueryCommand({
          logGroupIdentifiers: [input.logGroup],
          queryString: `fields @timestamp, @message, @logStream | sort @timestamp desc | limit 1000`,
          startTime: start / 1000,
          endTime: end / 1000,
        })
      )
      .catch(() => {});
    if (!result) return;
    console.log("created query", result.queryId);

    while (true) {
      const response = await client.send(
        new GetQueryResultsCommand({
          queryId: result.queryId,
        })
      );

      if (response.status === "Complete") {
        const results = response.results || [];
        let batch: LogEvent[] = [];
        let batchSize = 0;
        const events = pipe(
          results.flatMap((result, index) => {
            const evt = Log.process({
              id: index.toString(),
              timestamp: new Date(result[0]?.value! + " Z").getTime(),
              group: input.logGroup + "-recent",
              stream: result[2]?.value!,
              cold,
              line: result[1]?.value!,
            });
            if (evt) return [evt];
            return [];
          }),
          groupBy((evt) => evt[3]),
          values,
          map((evts) => evts.sort((a, b) => a[1] - b[1])),
          sort((b, a) => a[0][1] - b[0][1])
        );

        for (const evt of events.flat()) {
          invocations.add(evt[3]);
          if (batchSize >= 100 * 1024) {
            await Realtime.publish("log", batch);
            batch = [];
            batchSize = 0;
          }
          batch.push(evt);
          batchSize += JSON.stringify(evt).length;
        }
        await Realtime.publish("log", batch);
        if (invocations.size >= 50) {
          return;
        }
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
});

function delay(iteration: number) {
  const hours = Math.pow(2, iteration) - 1;
  return hours * 60 * 60 * 1000;
}
