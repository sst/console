import { lazy } from "../util/lazy";
import zlib from "zlib";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AWS, Credentials } from "../aws";
import { SourceMapConsumer } from "source-map";
import {
  filter,
  flatMap,
  flattenDeep,
  groupBy,
  map,
  maxBy,
  minBy,
  pipe,
  sort,
  sortBy,
  values,
} from "remeda";
import { createId } from "@paralleldrive/cuid2";
import { compress } from "../util/compress";
import { Config } from "sst/node/config";
import { Bucket } from "sst/node/bucket";
import { Realtime } from "../realtime";
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
        type: "error";
        error: string;
        message: string;
        stack: StackFrame[];
      }
  );

export type Processor = ReturnType<typeof createProcessor>;

const s3 = new S3Client({});

export function createProcessor(input: {
  arn: string;
  group: string;
  app: string;
  stage: string;
  credentials: Credentials;
  region: string;
}) {
  const s3bootstrap = new S3Client({
    region: input.region,
    credentials: input.credentials,
  });
  const invocations = new Map<string, number>();
  const cold = new Set<string>();
  let unknown = [] as LogEvent[];
  const sourcemapCache = new Map<string, SourceMapConsumer>();
  let results = [] as LogEvent[];

  const getBootstrap = lazy(() => AWS.Account.bootstrap(input));
  const sourcemapsMeta = lazy(async () => {
    const bootstrap = await getBootstrap();
    if (!bootstrap) return [];
    const result = await s3bootstrap.send(
      new ListObjectsV2Command({
        Bucket: bootstrap.bucket,
        Prefix: `sourcemap/${input.app}/${input.stage}/${input.arn}`,
      })
    );
    const maps = (result.Contents || []).map((item) => ({
      key: item.Key!,
      created: item.LastModified!.getTime(),
    }));
    console.log("source maps found", maps.length);
    return maps;
  });

  function generateInvocationID(id: string) {
    const trimmed = id.trim();
    const count = invocations.get(trimmed);
    if (!count) return trimmed;
    return id + "[" + count + "]";
  }

  async function getSourcemap(number: number) {
    const match = pipe(
      await sourcemapsMeta(),
      filter((x) => x.created < number),
      maxBy((x) => x.created)
    );
    if (!match) return;
    if (sourcemapCache.has(match.key)) {
      return sourcemapCache.get(match.key)!;
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
    raw.sources = raw.sources.map((item: string) => item.replaceAll("../", ""));
    const consumer = await new SourceMapConsumer(raw);
    sourcemapCache.set(match.key, consumer);
    return consumer;
  }

  const { group } = input;

  return {
    async process(input: {
      id: string;
      line: string;
      timestamp: number;
      stream: string;
    }) {
      const tabs = input.line.split("\t");

      if (tabs[0]?.startsWith("INIT_START")) {
        cold.add(input.stream);
        return [];
      }

      if (tabs[0]?.startsWith("START")) {
        const splits = tabs[0].split(" ");
        const isCold = cold.has(input.stream);
        cold.delete(input.stream);
        const id = generateInvocationID(splits[2]!);
        const flush = unknown.map((evt) => {
          evt.requestID = id;
          return evt;
        });
        unknown = [];
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

      if (tabs[0]?.length === 24) {
        const message: LogEvent = {
          type: "message",
          timestamp: input.timestamp,
          group,
          requestID: generateInvocationID(tabs[1]!),
          id: input.id,
          level: tabs[2]!.trim(),
          message: tabs.slice(3).join("\t").trim(),
        };
        const target = message.requestID === "undefined" ? unknown : results;

        if (message.level === "ERROR") {
          const parsed = (() => {
            if (
              tabs[3]?.includes("Invoke Error") ||
              tabs[3]?.includes("Uncaught Exception")
            )
              return JSON.parse(tabs[4]!);
            if (message.level === "ERROR" && tabs[3]) {
              const lines = tabs[3].split("\n");
              if (!lines[0]) return;
              const [error, message] = lines[0].split(": ");
              if (!error || !message) return;
              return {
                errorType: error,
                errorMessage: message,
                stack: lines,
              };
            }
          })();

          if (parsed) {
            const stack = await (async (): Promise<StackFrame[]> => {
              // drop first line, only has error in it
              const stack: string[] = parsed.stack.slice(1);
              const consumer = await getSourcemap(input.timestamp);
              if (consumer) {
                return stack.flatMap((item) => {
                  const splits: string[] = item.split(":");
                  const column = parseInt(splits.pop()!);
                  const line = parseInt(splits.pop()!);
                  if (!column || !line) return [];
                  const original = consumer.originalPositionFor({
                    line,
                    column,
                  });

                  if (!original.source) return [];
                  const lines =
                    consumer
                      .sourceContentFor(original.source, true)
                      ?.split("\n") || [];
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
              }

              return stack.map((raw) => ({ raw }));
            })();

            target.push({
              type: "error",
              timestamp: input.timestamp,
              group,
              requestID: message.requestID,
              error: parsed.errorType,
              message: parsed.errorMessage,
              stack,
            });
          }
        }
        target.push(message);
        return;
      }
    },
    async flush(order = 1) {
      const id = createId();
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
      );
      console.log("sending", events.length, "events");
      const key = `logevents/${id}.json`;
      await s3.send(
        new PutObjectCommand({
          Key: key,
          Bucket: Bucket.ephemeral.bucketName,
          ContentEncoding: "gzip",
          ContentType: "application/json",
          Body: await compress(JSON.stringify(events.flat())),
        })
      );
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: Bucket.ephemeral.bucketName,
          Key: key,
        })
      );

      await Realtime.publish("log.url", url);
      results = [];
    },
    results,
    invocations,
  };
}

import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  GetLogEventsCommand,
  OutputLogEvent,
} from "@aws-sdk/client-cloudwatch-logs";
import { GetFunctionCommand, LambdaClient } from "@aws-sdk/client-lambda";

export const expand = zod(
  z.object({
    timestamp: z.number(),
    requestID: z.string(),
    logGroup: z.string(),
    logStream: z.string(),
    region: z.string(),
    functionArn: z.string(),
    credentials: z.custom<Credentials>(),
  }),
  async (input) => {
    const cw = new CloudWatchLogsClient({
      region: input.region,
      credentials: input.credentials,
    });
    const lambda = new LambdaClient({
      region: input.region,
      credentials: input.credentials,
    });

    const func = await lambda.send(
      new GetFunctionCommand({
        FunctionName: input.functionArn,
      })
    );

    const app = func.Tags?.["sst:app"]!;
    const stage = func.Tags?.["sst:stage"]!;

    const offset = 1000 * 60 * 15;

    const processor = createProcessor({
      region: input.region,
      credentials: input.credentials,
      group: input.logGroup,
      app: app,
      stage: stage,
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
          if (backwards && event.message!.startsWith("REPORT")) break;
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
        stream: input.logStream,
        timestamp: event.timestamp!,
        id: i.toString(),
        line: event.message!,
      });
    }

    const results = processor.results.filter(
      (result) => result.requestID === input.requestID
    );

    return results;
  }
);
