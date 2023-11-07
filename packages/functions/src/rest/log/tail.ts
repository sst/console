import {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { Stage } from "@console/core/app/stage";
import { Log } from "@console/core/log";
import { withApiAuth } from "src/api";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { Storage } from "@console/core/storage";
import { z } from "zod";
import { Realtime } from "@console/core/realtime";

const Body = z.object({
  stageID: z.string(),
  logGroup: z.string(),
});

export const handler = ApiHandler(
  withApiAuth(async () => {
    const body = Body.parse(useJsonBody());
    let start = Date.now() - 2 * 60 * 1000;
    console.log("tailing from", start);
    const config = await Stage.assumeRole(body.stageID);
    if (!config)
      return {
        done: true,
      };
    const client = new CloudWatchLogsClient(config);
    const sourcemapKey =
      `arn:aws:lambda:${config.region}:${config.awsAccountID}:function:` +
      body.logGroup.split("/").slice(3, 5).join("/");

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

    const streams: string[] = [];

    for await (const stream of fetchStreams(body.logGroup)) {
      streams.push(stream.logStreamName || "");
      if (streams.length === 100) break;
    }
    if (!streams.length)
      return {
        statusCode: 200,
      };
    if (!start) start = Date.now() - 2 * 60 * 1000;

    console.log("fetching since", new Date(start).toLocaleString());
    const processor = Log.createProcessor({
      sourcemapKey,
      group: body.logGroup + "-tail",
      config,
    });

    for await (const event of fetchEvents(body.logGroup, start, streams)) {
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
      statusCode: 200,
    };
  })
);
