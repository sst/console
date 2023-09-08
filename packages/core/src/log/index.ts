import { lazy } from "../util/lazy";
import zlib from "zlib";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { AWS } from "../aws";
import { SourceMapConsumer } from "source-map";
import { filter, groupBy, map, maxBy, pipe, sortBy, values } from "remeda";
import { zod } from "../util/zod";
import { z } from "zod";

export * as Log from "./index";
export { Search } from "./search";

type LogEventBase = {
  timestamp: number;
  group: string;
  requestID: string;
};

export type StackFrame = {
  raw?: string;
  file?: string;
  line?: number;
  column?: number;
  fn?: string;
  context?: string[];
  important?: boolean;
};

export type LogEvent = LogEventBase &
  (
    | {
        type: "end";
      }
    | { type: "start"; cold: boolean }
    | {
        type: "report";
        duration: number;
        size: number;
        memory: number;
        xray: string;
      }
    | {
        type: "message";
        level: string;
        message: string;
        id: string;
      }
    | {
        id: string;
        type: "error";
        error: string;
        message: string;
        stack: StackFrame[];
      }
  );

export type LogEventType<T extends LogEvent["type"]> = Extract<
  LogEvent,
  { type: T }
>;

export type Processor = ReturnType<typeof createProcessor>;

export function createSourcemapCache(input: {
  config: StageCredentials;
  functionArn: string;
}) {
  const s3bootstrap = new S3Client({
    ...input.config,
    retryStrategy: RETRY_STRATEGY,
  });
  const sourcemapCache = new Map<string, any>();

  const getBootstrap = lazy(() => AWS.Account.bootstrap(input.config));
  const sourcemapsMeta = lazy(async () => {
    const bootstrap = await getBootstrap();
    if (!bootstrap) return [];
    const result = await s3bootstrap
      .send(
        new ListObjectsV2Command({
          Bucket: bootstrap.bucket,
          Prefix: `sourcemap/${input.config.app}/${input.config.stage}/${input.functionArn}`,
        })
      )
      .catch(() => {});
    if (!result) return [];
    const maps = (result.Contents || []).map((item) => ({
      key: item.Key!,
      created: item.LastModified!.getTime(),
    }));
    return maps;
  });

  return {
    async get(number: number) {
      const match = pipe(
        await sourcemapsMeta(),
        filter((x) => x.created < number),
        maxBy((x) => x.created)
      );
      if (!match) return;
      if (sourcemapCache.has(match.key)) {
        return await new SourceMapConsumer(sourcemapCache.get(match.key)!);
      }
      const bootstrap = await getBootstrap();
      const content = await s3bootstrap.send(
        new GetObjectCommand({
          Bucket: bootstrap!.bucket,
          Key: match.key,
        })
      );
      const raw = JSON.parse(
        zlib.unzipSync(await content.Body!.transformToByteArray()).toString()
      );
      raw.sources = raw.sources.map((item: string) =>
        item.replaceAll("../", "")
      );
      sourcemapCache.set(match.key, raw);
      const consumer = await new SourceMapConsumer(raw);
      return consumer;
    },
    destroy() {
      s3bootstrap.destroy();
      sourcemapCache.clear();
    },
  };
}

type SourcemapCache = ReturnType<typeof createSourcemapCache>;

export function createProcessor(input: {
  arn: string;
  group: string;
  config: StageCredentials;
}) {
  const invocations = new Map<string, number>();
  const streams = new Map<
    string,
    {
      cold: boolean;
      unknown: LogEvent[];
      requestID?: string;
    }
  >();
  let results = [] as LogEvent[];

  const sourcemapCache = createSourcemapCache({
    functionArn: input.arn,
    config: input.config,
  });

  function generateInvocationID(id: string) {
    const trimmed = id.trim();
    const count = invocations.get(trimmed);
    if (!count) return trimmed;
    return trimmed + "[" + count + "]";
  }

  const { group } = input;

  return {
    async process(input: {
      id: string;
      line: string;
      timestamp: number;
      streamName: string;
    }) {
      let stream = streams.get(input.streamName);
      if (!stream) {
        stream = {
          cold: false,
          unknown: [],
          requestID: "",
        };
        streams.set(input.streamName, stream);
      }
      const tabs = input.line.split("\t").map((t) => t.trim());

      if (tabs[0]?.startsWith("INIT_START")) {
        stream.cold = true;
        return [];
      }

      if (tabs[0]?.startsWith("START")) {
        const splits = tabs[0].split(" ");
        const isCold = stream.cold;
        stream.cold = false;
        const id = generateInvocationID(splits[2]!);
        const flush = stream.unknown.map((evt) => {
          evt.requestID = id;
          return evt;
        });
        stream.unknown = [];
        stream.requestID = id;
        return results.push(
          {
            type: "start",
            timestamp: input.timestamp,
            group,
            requestID: generateInvocationID(splits[2]!),
            cold: isCold,
          },
          ...flush
        );
      }

      if (tabs[0]?.startsWith("END")) {
        const splits = tabs[0].split(" ");
        return results.push({
          type: "end",
          timestamp: input.timestamp,
          group,
          requestID: generateInvocationID(splits[2]!),
        });
      }

      if (tabs[0]?.startsWith("REPORT")) {
        const generated = generateInvocationID(tabs[0].split(" ")[2]!);
        const requestID = tabs[0].split(" ")[2]!.trim();
        invocations.set(requestID, (invocations.get(requestID) || 0) + 1);
        return results.push({
          type: "report",
          timestamp: input.timestamp,
          group,
          requestID: generated,
          duration: parseInt(tabs[2]?.split(" ")[2] || "0"),
          size: parseInt(tabs[3]?.split(" ")[2] || "0"),
          memory: parseInt(tabs[4]?.split(" ")[3] || "0"),
          xray: tabs.find((line) => line.includes("XRAY"))?.split(" ")[2] || "",
        });
      }

      const message = (() => {
        const result: LogEventType<"message"> = {
          type: "message",
          timestamp: input.timestamp,
          group,
          requestID: stream.requestID || "",
          id: input.id,
          level: "INFO",
          message: tabs.join("\t").trim(),
        };

        // NodeJS format
        if (tabs[0]?.length === 24 && tabs[1]?.length === 36) {
          result.level = tabs[2]!.trim();
          result.message = tabs.slice(3).join("\t").trim();
        }

        return result;
      })();

      const target = message.requestID === "" ? stream.unknown : results;

      if (message.level === "ERROR") {
        const parsed = await extractError(
          sourcemapCache,
          input.timestamp,
          tabs
        );
        if (parsed) {
          target.push({
            id: message.id,
            type: "error",
            timestamp: input.timestamp,
            group,
            requestID: message.requestID,
            error: parsed.error,
            message: parsed.message,
            stack: parsed.stack,
          });
        }
      }

      target.push(message);
      return;
    },
    flush(order = 1) {
      const events = pipe(
        results,
        groupBy((evt) => evt.requestID),
        values,
        map((evts) =>
          sortBy(
            evts,
            (evt) => {
              return {
                start: 0,
                message: 1,
                error: 2,
                end: 3,
                report: 4,
              }[evt.type];
            },
            (evt) => evt.timestamp
          )
        ),
        sortBy((evts) => order * (evts[0]?.timestamp || 0))
      ).flat();
      results = [];
      return events;
    },
    destroy() {
      sourcemapCache.destroy();
    },
    results,
    invocations,
    get streams() {
      return streams;
    },
  };
}

import {
  CloudWatchLogsClient,
  GetLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { RETRY_STRATEGY } from "../util/aws";
import { StageCredentials } from "../app/stage";
import { retrySync } from "../util/retry";

export const expand = zod(
  z.object({
    timestamp: z.number(),
    logGroup: z.string(),
    logStream: z.string(),
    functionArn: z.string(),
    config: z.custom<StageCredentials>(),
  }),
  async (input) => {
    const cw = new CloudWatchLogsClient({
      ...input.config,
      retryStrategy: RETRY_STRATEGY,
    });
    const lambda = new LambdaClient({
      ...input.config,
      retryStrategy: RETRY_STRATEGY,
    });

    const offset = 1000 * 60 * 15;

    const processor = createProcessor({
      config: input.config,
      group: input.logGroup,
      arn: input.functionArn,
    });

    async function fetchEvents(start: number, end: number) {
      let nextToken: string | undefined;
      const result = [];
      const backwards = end === input.timestamp;
      while (true) {
        const response = await cw.send(
          new GetLogEventsCommand({
            logGroupName: input.logGroup,
            logStreamName: input.logStream,
            startTime: start,
            endTime: end,
            startFromHead: !backwards,
            nextToken,
          })
        );
        const events = pipe(
          response.events || [],
          sortBy((evt) => (backwards ? -1 : 1) * evt.timestamp!)
        );

        for (const event of events) {
          if (
            backwards &&
            (event.message!.startsWith("REPORT") ||
              event.message!.startsWith("END"))
          )
            break;
          result.push(event);
          if (!backwards && event.message!.startsWith("REPORT")) break;
        }

        nextToken = response.nextForwardToken;
        if (!response.events?.length) {
          break;
        }
      }

      if (backwards) result.reverse();
      return result;
    }

    const events = await Promise.all([
      fetchEvents(input.timestamp - offset, input.timestamp),
      fetchEvents(input.timestamp, input.timestamp + offset),
    ]).then((r) => r.flat());

    for (let i = 0; i < events.length; i++) {
      const event = events[i]!;
      await processor.process({
        streamName: input.logStream,
        timestamp: event.timestamp!,
        id: i.toString(),
        line: event.message!,
      });
    }

    cw.destroy();
    lambda.destroy();
    return processor.flush();
  }
);

type ParsedError = {
  error: string;
  message: string;
  stack: StackFrame[];
};
export async function extractError(
  sourcemapCache: SourcemapCache,
  timestamp: number,
  tabs: string[]
): Promise<ParsedError | undefined> {
  const parsed = (() => {
    // Generic AWS error handling
    if (
      tabs[3]?.includes("Invoke Error") ||
      tabs[3]?.includes("Uncaught Exception") ||
      tabs[3]?.includes("Unhandled Promise Rejection")
    ) {
      const parsed = JSON.parse(tabs[4]!);
      if (typeof parsed.stack == "string") {
        parsed.stack = parsed.stack.split("\n");
      }
      return {
        error: parsed.errorType || parsed.name,
        message: parsed.errorMessage || parsed.message,
        stack: (parsed.stack || [])
          .map((l: string) => l.trim())
          .filter((l: string) => l.startsWith("at ")),
      };
    }

    if (tabs[3]) {
      const lines = tabs[3].trim().split("\n");
      if (lines.length < 2) return;
      const [first] = lines;
      const [_, error, message] = first!.match(/([A-Z]\w+): (.+)$/) ?? [];
      if (!error || !message) return;
      if (error.startsWith("(node:")) return;
      return {
        error: error,
        message: message,
        stack: lines.map((l) => l.trim()).filter((l) => l.startsWith("at ")),
      };
    }
  })();

  if (!parsed) return;

  const stack = await (async (): Promise<StackFrame[]> => {
    const stack: string[] = parsed.stack;
    const consumer = await sourcemapCache.get(timestamp);
    if (consumer) {
      const result = stack.flatMap((item): StackFrame[] => {
        const [lineHint, columnHint] = item.match(/(\d+):(\d+)/) ?? [];
        if (!columnHint || !lineHint) return [{ raw: item }];
        const column = parseInt(columnHint);
        const line = parseInt(lineHint);
        const original = retrySync(1, () =>
          consumer.originalPositionFor({
            line,
            column,
          })
        );

        if (!original?.source) return [{ raw: item }];

        const lines =
          consumer.sourceContentFor(original.source, true)?.split("\n") || [];
        const min = Math.max(0, original.line! - 4);
        const ctx = lines.slice(
          min,
          Math.min(original.line! + 3, lines.length - 1)
        );

        return [
          {
            file: original.source,
            line: original.line!,
            column: original.column!,
            context: ctx,
            important: !original.source.startsWith("node_modules"),
          },
        ];
      });
      consumer.destroy();
      return result;
    }
    return stack.map((raw) => ({ raw }));
  })();
  parsed.stack = stack;
  return parsed;
}
