import {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  FilterLogEventsCommand,
  GetLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { provideActor } from "@console/core/actor";
import { App } from "@console/core/app";
import { AWS } from "@console/core/aws";
import { Log, LogEvent } from "@console/core/log";
import { LogPoller } from "@console/core/log/poller";
import { Realtime } from "@console/core/realtime";

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

export async function handler(input: State) {
  const attempts = input.status?.attempts || 0;
  let start = input.status?.start;
  const offset = input.status?.offset || -30 * 1000;
  if (attempts === 100) {
    return {
      done: true,
    };
  }
  provideActor({
    type: "system",
    properties: {
      workspaceID: input.workspaceID,
    },
  });
  const poller = await LogPoller.fromID(input.pollerID);
  if (!poller) {
    throw new Error(`No poller found for ${input.pollerID}`);
  }
  const stage = await App.Stage.fromID(poller.stageID);
  const account = await AWS.Account.fromID(stage!.awsAccountID);
  const credentials = await AWS.assumeRole(account!.accountID);
  if (!credentials)
    throw new Error("Unable to assume role for " + account!.accountID);
  const client = new CloudWatchLogsClient({
    region: stage!.region,
    credentials,
  });

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
    if (!start && stream.lastEventTimestamp) {
      const result = await client
        .send(
          new GetLogEventsCommand({
            startFromHead: false,
            limit: 1,
            logGroupIdentifier: input.logGroup,
            logStreamName: stream.logStreamName,
          })
        )
        .then((r) => r.events?.[0]);
      if (result) {
        console.log("found last event", result.timestamp, stream.logStreamName);
        start = (result.timestamp || 0) - 60 * 1000;
      }
    }
    if (streams.length === 100) break;
  }
  if (!start) start = Date.now() - 30 * 1000;

  console.log("fetching since", new Date(start + offset).toLocaleString());
  const processor = Log.createProcessor(input.logGroup + "-tail");
  let batch: LogEvent[] = [];
  let batchSize = 0;

  for await (const event of fetchEvents(
    input.logGroup,
    start + offset,
    streams
  )) {
    if (batchSize >= 100 * 1024) {
      console.log("publishing batch sized", batchSize);
      await Realtime.publish("log", batch);
      batch = [];
      batchSize = 0;
    }
    const evts = Log.process({
      processor,
      timestamp: event.timestamp!,
      line: event.message!,
      stream: event.logStreamName!,
      id: event.eventId!,
    });
    batch.push(...evts);
    batchSize += JSON.stringify(evts).length;
  }
  await Realtime.publish("log", batch);
  console.log("published", processor.invocations.size, "events");

  return {
    attempts: attempts + 1,
    offset: Date.now() - start - 30 * 1000,
    start,
    done: false,
  } satisfies State["status"];
}
