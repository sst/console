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
import { filter, groupBy, map, maxBy, minBy, pipe, sort, values } from "remeda";
import { createId } from "@paralleldrive/cuid2";
import { compress } from "../util/compress";
import { Config } from "sst/node/config";
import { Bucket } from "sst/node/bucket";
import { Realtime } from "../realtime";

export * as Log from "./index";
export { Search } from "./search";

type LogEventBase = {
  timestamp: number;
  group: string;
  requestID: string;
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
        trace: string[];
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
        if (tabs[3]?.includes("Invoke Error")) {
          const parsed = JSON.parse(tabs[4]!);
          const consumer = await getSourcemap(input.timestamp);
          if (consumer) {
            let ctx: string[] = [];
            for (let i = 0; i < parsed.stack.length; i++) {
              const splits: string[] = parsed.stack[i].split(":");
              const column = parseInt(splits.pop()!);
              const line = parseInt(splits.pop()!);
              if (!column || !line) continue;
              const original = consumer.originalPositionFor({
                line,
                column,
              });
              if (
                original.source &&
                !original.source.startsWith("node_modules") &&
                !ctx.length
              ) {
                const lines =
                  consumer
                    .sourceContentFor(original.source, true)
                    ?.split("\n") || [];
                const min = Math.max(0, original.line! - 4);
                ctx = lines.slice(
                  min,
                  Math.min(original.line! + 3, lines.length - 1)
                );
                const highlight = Math.min(original.line!, 3);
                ctx[highlight] = "> " + ctx[highlight]?.substring(2);
              }
              parsed.stack[
                i
              ] = `    at ${original.source}:${original.line}:${original.column}`;
            }
            parsed.stack.push("----", ...ctx);
          }

          results.push({
            type: "error",
            timestamp: input.timestamp,
            group,
            requestID: generateInvocationID(tabs[1]!),
            error: parsed.errorType,
            message: parsed.errorMessage,
            trace: parsed.stack,
          });
        }
        const result: LogEvent = {
          type: "message",
          timestamp: input.timestamp,
          group,
          requestID: generateInvocationID(tabs[1]!),
          id: input.id,
          level: tabs[2]!.trim(),
          message: tabs.slice(3).join("\t").trim(),
        };
        if (result.requestID === "undefined") {
          unknown.push(result);
          return;
        }
        return results.push(result);
      }
    },
    async flush() {
      const id = createId();
      const events = pipe(
        results,
        groupBy((evt) => evt.requestID),
        values,
        map((evts) => evts.sort((a, b) => a.timestamp - b.timestamp)),
        sort((b, a) => a[0].timestamp - b[0].timestamp)
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
