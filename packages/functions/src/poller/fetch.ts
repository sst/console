import {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  FilterLogEventsCommand,
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

export async function handler(input: State) {
  throw "lol";
  const attempts = input.status?.attempts || 0;
  const start = input.status?.start || Date.now();
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
    if (streams.length === 100) break;
  }

  let count = 0;
  console.log("fetching since", offset);
  for await (const event of fetchEvents(
    input.logGroup,
    start + offset,
    streams
  )) {
    count++;
    const tabs = (event.message || "").split("\t");

    if (tabs[0]?.startsWith("START")) {
      const splits = tabs[0].split(" ");
      await Realtime.publish("log.start", {
        t: event.timestamp,
        l: input.logGroup,
        r: splits[2],
      });
      continue;
    }

    if (tabs[0]?.length === 24) {
      await Realtime.publish("log.entry", {
        t: event.timestamp,
        l: input.logGroup,
        r: tabs[1],
        k: tabs[2],
        m: tabs[3],
        i: event.eventId,
      });
      continue;
    }
  }
  console.log("published", count, "events");

  return {
    attempts: attempts + 1,
    offset: Date.now() - start - 30 * 1000,
    start,
    done: false,
  } satisfies State["status"];
}
