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
import { Replicache } from "@console/core/replicache";
import { groupBy, map, pipe, sort, values } from "remeda";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(Log.Search.Events.Created, async (evt) => {
  provideActor(evt.metadata.actor);
  const search = await Log.Search.fromID(evt.properties.id);
  if (!search) return;
  const config = await Stage.assumeRole(search.stageID);

  const client = new CloudWatchLogsClient(config);
  console.log("scanning logs", search);

  try {
    await (async () => {
      let iteration = 0;
      const processor = Log.createProcessor(search.id);

      let initial = search.timeStart
        ? new Date(search.timeStart + "Z")
        : undefined;
      const isFixed = search.timeEnd != null;

      if (!initial) {
        const response = await client.send(
          new DescribeLogStreamsCommand({
            logGroupIdentifier: search.logGroup,
            orderBy: "LastEventTime",
            descending: true,
            limit: 1,
          })
        );
        console.log(response.logStreams);
        initial = new Date(
          response.logStreams?.[0]?.lastEventTimestamp! + 30 * 60 * 1000
        );
      }
      console.log("start", initial.toLocaleString());
      while (true) {
        iteration++;
        const start = initial.getTime() - (isFixed ? 0 : delay(iteration));
        const end = isFixed
          ? new Date(search.timeEnd + "Z").getTime()
          : initial.getTime() - delay(iteration - 1);
        await Log.Search.setStart({
          id: search.id,
          timeStart: new Date(start).toISOString().split("Z")[0]!,
        });
        await Replicache.poke();
        console.log(
          "scanning from",
          new Date(start).toLocaleString(),
          "to",
          new Date(end).toLocaleString()
        );
        const result = await client
          .send(
            new StartQueryCommand({
              logGroupIdentifiers: [search.logGroup],
              queryString: `fields @timestamp, @message, @logStream | sort @timestamp desc | limit 10000`,
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
            console.log(results);
            let batch: LogEvent[] = [];
            let batchSize = 0;
            const events = pipe(
              results
                .sort((a, b) => a[0]!.value!.localeCompare(b[0]!.value!))
                .flatMap((result, index) => {
                  return Log.process({
                    processor,
                    id: index.toString(),
                    timestamp: new Date(result[0]?.value! + " Z").getTime(),
                    stream: result[2]?.value!,
                    line: result[1]?.value!,
                  });
                }),
              groupBy((evt) => evt[3]),
              values,
              map((evts) => evts.sort((a, b) => a[1] - b[1])),
              sort((b, a) => a[0][1] - b[0][1])
            );
            console.log("sending", events.length, "events");

            for (const evt of events.flat()) {
              if (batchSize >= 100 * 1024) {
                await Realtime.publish("log", batch);
                batch = [];
                batchSize = 0;
              }
              batch.push(evt);
              batchSize += JSON.stringify(evt).length;
            }
            await Realtime.publish("log", batch);
            if (processor.invocations.size >= 50 || isFixed) {
              return;
            }
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    })();
  } catch {}

  await Log.Search.complete(search.id);
  await Replicache.poke();
});

function delay(iteration: number) {
  const hours = Math.pow(2, iteration) - 1;
  return hours * 60 * 60 * 1000;
}
