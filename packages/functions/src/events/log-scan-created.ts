import {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  GetQueryResultsCommand,
  StartQueryCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { withActor } from "@console/core/actor";
import { Stage } from "@console/core/app";
import { Log } from "@console/core/log";
import { Realtime } from "@console/core/realtime";
import { Replicache } from "@console/core/replicache";
import { EventHandler } from "sst/node/event-bus";
import { Storage } from "@console/core/storage";
import { DateTime } from "luxon";

export const handler = EventHandler(Log.Search.Events.Created, (evt) =>
  withActor(evt.metadata.actor, async () => {
    const search = await Log.Search.fromID(evt.properties.id);
    if (!search) return;
    const profileID = search.profileID || undefined;
    const config = await Stage.assumeRole(search.stageID);
    if (!config) return;

    const client = new CloudWatchLogsClient(config);
    console.log("scanning logs", search);

    try {
      await (async () => {
        let iteration = 0;

        let end = search.timeEnd
          ? DateTime.fromSQL(search.timeEnd, { zone: "utc" })
          : DateTime.now();
        let start = search.timeEnd
          ? end.minus({ hours: 1 })
          : await (async () => {
              const response = await client.send(
                new DescribeLogStreamsCommand({
                  logGroupIdentifier: search.logGroup,
                  orderBy: "LastEventTime",
                  descending: true,
                  limit: 1,
                })
              );
              return DateTime.fromMillis(
                response.logStreams?.[0]?.lastEventTimestamp! - 30 * 60 * 1000
              ).startOf("hour");
            })();

        console.log("start", start.toLocaleString(DateTime.DATETIME_SHORT));

        const processor = Log.createProcessor({
          sourcemapKey:
            `arn:aws:lambda:${config.region}:${config.awsAccountID}:function:` +
            search.logGroup.split("/").slice(3, 5).join("/"),
          group: search.id,
          config,
        });

        while (true) {
          await Log.Search.setStart({
            id: search.id,
            timeStart: new Date(start).toISOString().split("Z")[0]!,
          });
          await Replicache.poke(profileID);
          console.log(
            "scanning from",
            start.toLocaleString(DateTime.DATETIME_SHORT),
            "to",
            end.toLocaleString(DateTime.DATETIME_SHORT)
          );
          const result = await client
            .send(
              new StartQueryCommand({
                logGroupIdentifiers: [search.logGroup],
                queryString: `fields @timestamp, @message, @logStream | sort @timestamp desc | limit 10000`,
                startTime: start.toMillis() / 1000,
                endTime: end.toMillis() / 1000,
              })
            )
            .catch(() => {});
          if (!result) return;
          console.log("created query", result.queryId);

          let flushed = 0;
          while (true) {
            const response = await client.send(
              new GetQueryResultsCommand({
                queryId: result.queryId,
              })
            );

            if (response.status === "Complete") {
              const results = response.results || [];
              console.log("log insights results", results.length);

              let index = 0;
              for (const result of results.sort((a, b) =>
                a[0]!.value!.localeCompare(b[0]!.value!)
              )) {
                await processor.process({
                  id: index.toString(),
                  timestamp: new Date(result[0]?.value! + " Z").getTime(),
                  streamName: result[2]?.value!,
                  line: result[1]?.value!,
                });
                index++;
              }

              const data = processor.flushInvocations(-1);
              console.log(
                "flushing invocations",
                data.length,
                "flushed so far",
                flushed
              );
              if (data.length) {
                flushed += data.length;
                const url = await Storage.putEphemeral(JSON.stringify(data), {
                  ContentType: "application/json",
                });
                await Realtime.publish("invocation.url", url, profileID);
              }
              if (flushed >= 50) {
                return;
              }

              break;
            }

            await new Promise((resolve) => setTimeout(resolve, 200));
          }

          iteration++;
          end = start;
          start = start.minus({ millisecond: delay(iteration) });
        }
      })();
    } catch (ex) {
      console.log("error", ex);
    }

    await Log.Search.complete(search.id);
    await Replicache.poke(profileID);
  })
);

function delay(iteration: number) {
  const hours = Math.pow(2, iteration) - 1;
  return hours * 60 * 60 * 1000;
}
