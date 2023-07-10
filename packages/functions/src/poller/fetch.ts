import {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  FilterLogEventsCommand,
  GetLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { provideActor } from "@console/core/actor";
import { App } from "@console/core/app";
import { AWS } from "@console/core/aws";
import { LogPoller } from "@console/core/log-poller";
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

export type Log =
  | ["e", number, string, string]
  | ["s", number, string, string, boolean]
  | ["r", number, string, string, number]
  | ["m", number, string, string, string, string, string];

const l: Log = [] as any;

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

  let count = 0;
  console.log("fetching since", new Date(start + offset).toLocaleString());
  const cold = new Set<string>();
  let batch: Log[] = [];
  let batchSize = 0;

  function push(log: Log) {
    batch.push(log);
    batchSize += JSON.stringify(log).length;
  }
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
    count++;
    const tabs = (event.message || "").split("\t");

    if (tabs[0]?.startsWith("INIT_START")) {
      cold.add(event.logStreamName!);
      continue;
    }
    if (tabs[0]?.startsWith("START")) {
      const splits = tabs[0].split(" ");
      push([
        "s",
        event.timestamp!,
        input.logGroup,
        splits[2]!,
        cold.has(event.logStreamName!),
      ]);
      cold.delete(event.logStreamName!);
      continue;
    }
    if (tabs[0]?.startsWith("END")) {
      const splits = tabs[0].split(" ");
      push(["e", event.timestamp!, input.logGroup, splits[2]!]);
      continue;
    }

    if (tabs[0]?.startsWith("REPORT")) {
      push([
        "r",
        event.timestamp!,
        input.logGroup,
        tabs[0].split(" ")[2]!,
        parseInt(tabs[2]?.split(" ")[2] || "0"),
      ]);
      continue;
    }

    if (tabs[0]?.length === 24) {
      push([
        "m",
        event.timestamp!,
        input.logGroup,
        tabs[1]!,
        tabs[2]!,
        tabs.slice(3).join("\t"),
        event.eventId!,
      ]);
      continue;
    }
    console.log("unhandled log line", tabs);
  }
  await Realtime.publish("log", batch);
  console.log("published", count, "events");

  return {
    attempts: attempts + 1,
    offset: Date.now() - start - 30 * 1000,
    start,
    done: false,
  } satisfies State["status"];
}
