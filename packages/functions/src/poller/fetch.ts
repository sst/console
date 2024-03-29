import {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  FilterLogEventsCommand,
  GetLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { S3Client } from "@aws-sdk/client-s3";
import { withActor } from "@console/core/actor";
import { App, Stage } from "@console/core/app";
import { AWS } from "@console/core/aws";
import { Log } from "@console/core/log";
import { LogPoller } from "@console/core/log/poller";
import { Realtime } from "@console/core/realtime";
import { Storage } from "@console/core/storage";

interface State {
  pollerID: string;
  workspaceID: string;
  stageID: string;
  logGroup: string;
  status?: {
    offset: number;
    start: number;
    done: boolean;
    attempts: number;
  };
}

export function handler(input: State) {
  return withActor(
    {
      type: "system",
      properties: {
        workspaceID: input.workspaceID,
      },
    },
    async () => {
      const attempts = input.status?.attempts || 0;
      let start = input.status?.start;
      const offset = input.status?.offset || -30 * 1000;
      if (attempts === 100) {
        return {
          done: true,
        };
      }
      const poller = await LogPoller.fromID(input.pollerID);
      if (!poller) {
        throw new Error(`No poller found for ${input.pollerID}`);
      }
      const config = await Stage.assumeRole(poller.stageID);
      if (!config)
        return {
          done: true,
        };
      const client = new CloudWatchLogsClient(config);
      const sourcemapKey =
        `arn:aws:lambda:${config.region}:${config.awsAccountID}:function:` +
        input.logGroup.split("/").slice(3, 5).join("/");

      async function* fetchStreams(logGroup: string) {
        let nextToken: string | undefined;
        console.log("fetching streams for", logGroup);

        while (true) {
          try {
            const response = await client.send(
              new DescribeLogStreamsCommand({
                logGroupIdentifier: logGroup,
                nextToken: nextToken,
                orderBy: "LastEventTime",
                descending: true,
              })
            );

            for (const logStream of response.logStreams || []) {
              yield logStream;
            }

            nextToken = response.nextToken;
            if (!nextToken) {
              break;
            }
          } catch (e) {
            break;
          }
        }
      }

      async function* fetchEvents(
        logGroup: string,
        startTime: number,
        streams: string[]
      ) {
        let nextToken: string | undefined;
        console.log("fetching logs for", streams.length, "streams");

        while (true) {
          const response = await client.send(
            new FilterLogEventsCommand({
              logGroupIdentifier: logGroup,
              logStreamNames: streams,
              nextToken,
              startTime,
            })
          );

          for (const event of response.events || []) {
            yield event;
          }

          nextToken = response.nextToken;
          if (!nextToken) {
            break;
          }
        }
      }

      console.log("running loop", attempts);

      const streams: string[] = [];

      for await (const stream of fetchStreams(input.logGroup)) {
        streams.push(stream.logStreamName || "");
        if (streams.length === 100) break;
      }
      if (!streams.length)
        return {
          ...input.status,
          done: false,
        };
      if (!start) start = Date.now() - 2 * 60 * 1000;

      console.log("fetching since", new Date(start + offset).toLocaleString());
      const processor = Log.createProcessor({
        sourcemapKey,
        group: input.logGroup + "-tail",
        config,
      });

      for await (const event of fetchEvents(
        input.logGroup,
        start + offset,
        streams
      )) {
        await processor.process({
          timestamp: event.timestamp!,
          line: event.message!,
          streamName: event.logStreamName!,
          id: event.eventId!,
        });
      }

      const data = processor.flush();
      if (data.length) {
        console.log("sending", data.length, "invocations");
        const url = await Storage.putEphemeral(JSON.stringify(data), {
          ContentType: "application/json",
        });
        await Realtime.publish("invocation.url", url);
      }

      return {
        attempts: attempts + 1,
        offset: Date.now() - start - 30 * 1000,
        start,
        done: false,
      } satisfies State["status"];
    }
  );
}
