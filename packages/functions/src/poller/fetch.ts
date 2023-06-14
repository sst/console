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
    timestamp: number;
    done: boolean;
    attempts: number;
  };
}

export async function handler(input: State) {
  const attempts = input.status?.attempts || 0;
  const timestamp = input.status?.timestamp || Date.now();
  if (attempts === 100) {
    await LogPoller.clear(input.pollerID);
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
    credentials,
  });

  async function* fetchStreams(logGroup: string) {
    let nextToken: string | undefined;
    console.log("fetching streams for", logGroup);

    while (true) {
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

  for await (const event of fetchEvents(input.logGroup, timestamp, streams)) {
    await Realtime.publish("log", {
      logGroup: input.logGroup,
      event,
    });
  }

  return {
    attempts: attempts + 1,
    timestamp: Date.now(),
    done: false,
  } satisfies State["status"];
}
