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

export interface Invocation {
  id: string;
  source: string;
  cold: boolean;
  input?: any;
  output?: any;
  errors: (ParsedError & { id: string })[];
  report?: {
    duration: number;
    size: number;
    memory: number;
    xray: string;
  };
  start: number;
  end?: number;
  logs: Log[];
}

interface Log {
  id: string;
  timestamp: number;
  message: string;
}

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
    meta() {
      return sourcemapsMeta();
    },
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
          requestID:
            tabs[1]?.length === 36
              ? generateInvocationID(tabs[1]!)
              : stream.requestID || "",
          id: input.id,
          level: "INFO",
          message: formatLogMessage(tabs),
        };

        // NodeJS format
        if (
          tabs[0]?.length === 24 &&
          (tabs[1]?.length === 36 || tabs[1] === "undefined")
        ) {
          result.level = tabs[2]!.trim();
          result.message = formatLogMessage(tabs.slice(3));
        }

        return result;
      })();

      const target = message.requestID === "" ? stream.unknown : results;

      if (message.level === "ERROR") {
        const err = extractError(tabs);
        if (err) {
          const mapped = await applySourcemap(
            sourcemapCache,
            input.timestamp,
            err
          );
          target.push({
            id: message.id,
            type: "error",
            timestamp: input.timestamp,
            group,
            requestID: message.requestID,
            error: mapped.error,
            message: mapped.message,
            stack: mapped.stack,
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
    flushInvocations(order = 1) {
      const events = pipe(
        results,
        groupBy((evt) => evt.requestID),
        values,
        map((evts) => {
          // @ts-expect-error
          const invocation: Invocation = {
            source: group,
            logs: [],
            errors: [],
          };
          const sorted = sortBy(
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
          );
          for (const evt of sorted) {
            switch (evt.type) {
              case "start":
                invocation.start = evt.timestamp;
                invocation.id = evt.requestID;
                invocation.cold = evt.cold;
                break;
              case "message":
                invocation.logs.push({
                  id: evt.id,
                  message: evt.message,
                  timestamp: evt.timestamp,
                });
                break;
              case "error":
                invocation.errors.push({
                  error: evt.error,
                  message: evt.message,
                  id: evt.id,
                  stack: evt.stack,
                });
                break;
              case "report":
                invocation.report = {
                  size: evt.size,
                  xray: evt.xray,
                  memory: evt.memory,
                  duration: evt.duration,
                };
            }
          }
          return invocation;
        }),
        filter((invocation) => Boolean(invocation.id)),
        sortBy((invocation) => order * invocation.start)
      );
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
import { RETRY_STRATEGY } from "../util/aws";
import { StageCredentials } from "../app/stage";
import { extractJSON } from "../util/json";

export const expand = zod(
  z.object({
    timestamp: z.number(),
    group: z.string(),
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

    const offset = 1000 * 60 * 15;

    const processor = createProcessor({
      config: input.config,
      group: input.group,
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
    return processor.flushInvocations();
  }
);

export type ParsedError = {
  error: string;
  message: string;
  stack: StackFrame[];
};
export function extractError(tabs: string[]): ParsedError | undefined {
  // Timeout
  const timeout = tabs.find((l) => l.includes("Task timed out after"));
  if (timeout) {
    return {
      error: "LambdaTimeoutError",
      message: timeout,
      stack: [],
    };
  }

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
      stack: ((parsed.stack || []) as string[])
        .map((l: string) => l.trim())
        .filter((l: string) => l.startsWith("at "))
        .map((raw) => ({ raw })),
    };
  }

  // NodeJS inline
  if (
    tabs[0]?.length === 24 &&
    (tabs[1]?.length === 36 || tabs[1] === "undefined") &&
    tabs[3]
  ) {
    const line = tabs[3];

    // Logtail
    if (line[0] === "{") {
      const parts = extractJSON(line);
      for (const part of parts) {
        if (part.message && part.stack) {
          const [description, ...stack] = part.stack;
          const [_, error, message] =
            description!.match(/([A-Z]\w+): (.+)$/s) ?? [];
          return {
            error: error,
            message: message,
            stack: stack
              .map((l: string) => l.trim())
              .map((raw: string) => ({
                raw,
              })),
          };
        }
      }
    }

    // default
    const [description, ...stack] = line.split(/\n\s{4}(?=at)/g);
    if (!description) return;
    if (description.startsWith("(node:")) return;
    const [error, message] = (() => {
      // Normal error
      const [_, error, message] =
        description!.match(/([A-Z\[][\w\]]+): (.+)$/s) ?? [];
      if (error && message) return [error, message];

      // No clue how to parse this
      return [description.substring(0, 128), "Unknown message"];
    })();
    if (!error) return;
    return {
      error: error,
      message: message,
      stack: stack
        .map((l) => l.trim())
        .map((raw) => ({
          raw,
        })),
    };
  }

  // Python inline
}

export async function applySourcemap(
  sourcemapCache: SourcemapCache,
  timestamp: number,
  error: ParsedError
): Promise<ParsedError> {
  if (!error.stack.length) return error;
  const consumer = await sourcemapCache.get(timestamp);
  if (!consumer) return error;

  const result = error.stack.flatMap((item): StackFrame[] => {
    const [lineHint, columnHint] = item.raw!.match(/(\d+):(\d+)/) ?? [];
    if (!columnHint || !lineHint) return [];
    const column = parseInt(columnHint);
    const line = parseInt(lineHint);
    const original = (() => {
      try {
        return consumer.originalPositionFor({
          line,
          column,
        });
      } catch (ex) {
        console.error(ex);
      }
    })();

    if (!original?.source) return [];

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
  if (!result.length) return error;

  return {
    ...error,
    stack: result,
  };
}

function formatLogMessage(parts: string[]) {
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part[0] === "{" && part.at(-1) === "}") {
      try {
        const parsed = JSON.parse(part);
        parts[i] = JSON.stringify(parsed, null, 2);
        continue;
      } catch {}
    }
    parts[i] = part;
  }

  return parts.join("\t").trim();
}
