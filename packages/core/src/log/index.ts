export * as Log from "./index";

import { z } from "zod";
import { zod } from "../util/zod";
import { Stage } from "../app";
import {
  CloudWatchLogsClient,
  GetQueryResultsCommand,
  StartQueryCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { event } from "../event";

export const Events = {
  ScanCreated: event("log.scan.created", {
    stageID: z.string(),
    logGroup: z.string(),
    start: z.number(),
  }),
};

export const scan = zod(
  z.object({
    stageID: z.string(),
    logGroup: z.string(),
    start: z.number(),
  }),
  async (input) => {
    await Events.ScanCreated.publish(input);
  }
);

export type LogEvent =
  | ["e", number, string, string]
  | ["s", number, string, string, boolean]
  | ["r", number, string, string, number]
  | ["m", number, string, string, string, string, string];

export function process(input: {
  id: string;
  line: string;
  timestamp: number;
  group: string;
  stream: string;
  cold: Set<string>;
}): LogEvent | undefined {
  const tabs = input.line.split("\t");
  if (tabs[0]?.startsWith("INIT_START")) {
    input.cold.add(input.stream);
    return;
  }
  if (tabs[0]?.startsWith("START")) {
    const splits = tabs[0].split(" ");
    const cold = input.cold.has(input.stream);
    input.cold.delete(input.stream);
    return ["s", input.timestamp, input.group, splits[2]!, cold];
  }

  if (tabs[0]?.startsWith("END")) {
    const splits = tabs[0].split(" ");
    return ["e", input.timestamp, input.group, splits[2]!];
  }

  if (tabs[0]?.startsWith("REPORT")) {
    return [
      "r",
      input.timestamp,
      input.group,
      tabs[0].split(" ")[2]!,
      parseInt(tabs[2]?.split(" ")[2] || "0"),
    ];
  }

  if (tabs[0]?.length === 24) {
    return [
      "m",
      input.timestamp,
      input.group,
      tabs[1]!,
      tabs[2]!,
      tabs.slice(3).join("\t"),
      input.id,
    ];
  }
  console.log("unhandled log line", tabs);
}
