import {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

interface State {
  LogGroup: string;
  PollerID: string;
  status?: {
    timestamp: number;
    done: boolean;
    attempts: number;
  };
}
const client = new CloudWatchLogsClient({});

export async function handler(input: State) {
  const attempts = input.status?.attempts || 0;
  const timestamp = input.status?.timestamp || Date.now();
  if (attempts === 100) {
    return {
      done: true,
    };
  }

  const streams: string[] = [];
  for await (const stream of fetchStreams(input.LogGroup)) {
    streams.push(stream.logStreamName || "");
    if (streams.length === 100) break;
  }

  for await (const event of fetchEvents(input.LogGroup, timestamp, streams)) {
    console.log(event.message);
  }

  console.log("doing work....");
  return {
    attempts: attempts + 1,
    timestamp: Date.now(),
    done: false,
  } satisfies State["status"];
}

async function* fetchStreams(name: string) {
  let nextToken: string | undefined;
  console.log("fetching streams for", name);

  while (true) {
    const response = await client.send(
      new DescribeLogStreamsCommand({
        logGroupName: name,
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
        logGroupName: logGroup,
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
