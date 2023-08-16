import { lazy } from "../util/lazy";
import zlib from "zlib";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { AWS, Credentials } from "../aws";
import { SourceMapConsumer } from "source-map";
import { Stage } from "../app";
import { filter, maxBy, minBy, pipe } from "remeda";

export * as Log from "./index";
export { Search } from "./search";

export type LogEvent =
  // end
  | ["e", number, string, string]
  // start
  | ["s", number, string, string, boolean]
  // report
  | [
      "r",
      number /* timestamp */,
      string /* group     */,
      string /* requestID */,
      number /* duration  */,
      number /* size      */,
      number /* memory    */,
      string /* xray */
    ]
  // message
  | ["m", number, string, string, string, string, string]
  // trace
  | [
      "t",
      number /* timestamp */,
      string /* logGroup  */,
      string /* requestID */,
      string /* type      */,
      string /* message   */,
      string[] /* trace   */
    ];

export type Processor = ReturnType<typeof createProcessor>;

export function createProcessor(input: {
  arn: string;
  group: string;
  app: string;
  stage: string;
  credentials: Credentials;
  region: string;
}) {
  const s3 = new S3Client({
    region: input.region,
    credentials: input.credentials,
  });

  const getBootstrap = lazy(() => AWS.Account.bootstrap(input));
  const sourcemapsMeta = lazy(async () => {
    const bootstrap = await getBootstrap();
    if (!bootstrap) return [];
    const result = await s3.send(
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

  const sourcemapCache = new Map<string, SourceMapConsumer>();

  return {
    group: input.group,
    cold: new Set<string>(),
    unknown: [] as LogEvent[],
    invocations: new Map<string, number>(),
    sourcemaps: {
      async forTimestamp(number: number) {
        const match = pipe(
          await sourcemapsMeta(),
          // filter((x) => x.created < number),
          maxBy((x) => x.created)
        );
        if (!match) return;
        if (sourcemapCache.has(match.key)) {
          return sourcemapCache.get(match.key)!;
        }
        const bootstrap = await getBootstrap();
        const content = await s3.send(
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
        const consumer = await new SourceMapConsumer(raw);
        sourcemapCache.set(match.key, consumer);
        return consumer;
      },
    },
  };
}

export async function process(input: {
  id: string;
  line: string;
  timestamp: number;
  stream: string;
  processor: Processor;
}): Promise<LogEvent[]> {
  function generateID(id: string) {
    const trimmed = id.trim();
    const count = input.processor.invocations.get(trimmed);
    if (!count) return trimmed;
    return id + "[" + count + "]";
  }
  const tabs = input.line.split("\t");
  if (tabs[0]?.startsWith("INIT_START")) {
    input.processor.cold.add(input.stream);
    return [];
  }
  if (tabs[0]?.startsWith("START")) {
    const splits = tabs[0].split(" ");
    const cold = input.processor.cold.has(input.stream);
    input.processor.cold.delete(input.stream);
    const id = generateID(splits[2]!);
    const flush = input.processor.unknown.map((evt) => {
      evt[3] = id;
      return evt;
    });
    input.processor.unknown = [];
    return [
      [
        "s",
        input.timestamp,
        input.processor.group,
        generateID(splits[2]!),
        cold,
      ],
      ...flush,
    ];
  }

  if (tabs[0]?.startsWith("END")) {
    const splits = tabs[0].split(" ");
    return [
      ["e", input.timestamp, input.processor.group, generateID(splits[2]!)],
    ];
  }

  if (tabs[0]?.startsWith("REPORT")) {
    const generated = generateID(tabs[0].split(" ")[2]!);
    const requestID = tabs[0].split(" ")[2]!.trim();
    input.processor.invocations.set(
      requestID,
      (input.processor.invocations.get(requestID) || 0) + 1
    );
    return [
      [
        "r",
        input.timestamp,
        input.processor.group,
        generated,
        parseInt(tabs[2]?.split(" ")[2] || "0"),
        parseFloat(tabs[3]?.split(" ")[2] || "0"),
        parseInt(tabs[4]?.split(" ")[3] || "0"),
        tabs.find((line) => line.includes("XRAY"))?.split(" ")[2] || "",
      ],
    ];
  }

  if (tabs[0]?.length === 24) {
    if (tabs[3]?.includes("Invoke Error")) {
      const parsed = JSON.parse(tabs[4]!);
      const consumer = await input.processor.sourcemaps.forTimestamp(
        input.timestamp
      );
      if (consumer) {
        for (let i = 0; i < parsed.stack.length; i++) {
          const splits: string[] = parsed.stack[i].split(":");
          const column = parseInt(splits.pop()!);
          const line = parseInt(splits.pop()!);
          if (!column || !line) continue;
          const original = consumer.originalPositionFor({
            line,
            column,
          });
          parsed.stack[
            i
          ] = `    at ${original.source}:${original.line}:${original.column}`;
        }
      }
      return [
        [
          "t",
          input.timestamp,
          input.processor.group,
          generateID(tabs[1]!),
          parsed.errorType,
          parsed.errorMessage,
          parsed.stack,
        ],
      ];
    }
    const result: LogEvent = [
      "m",
      input.timestamp,
      input.processor.group,
      generateID(tabs[1]!),
      tabs[2]!.trim(),
      tabs.slice(3).join("\t").trim(),
      input.id,
    ];
    if (result[3] === "undefined") {
      input.processor.unknown.push(result);
      return [];
    }
    return [result];
  }
  return [];
}
