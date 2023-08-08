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

export function createProcessor(group: string) {
  return {
    group,
    cold: new Set<string>(),
    invocations: new Map<string, number>(),
  };
}

export function process(input: {
  id: string;
  line: string;
  timestamp: number;
  stream: string;
  processor: Processor;
}): LogEvent[] {
  console.log(input.line);
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
    return [
      [
        "s",
        input.timestamp,
        input.processor.group,
        generateID(splits[2]!),
        cold,
      ],
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
      return [
        "t",
        input.timestamp,
        input.processor.group,
        generateID(tabs[1]!),
        parsed.errorType,
        parsed.errorMessage,
        parsed.stack,
      ];
    }
    return [
      [
        "m",
        input.timestamp,
        input.processor.group,
        generateID(tabs[1]!),
        tabs[2]!.trim(),
        tabs.slice(3).join("\t").trim(),
        input.id,
      ],
    ];
  }
  console.log("unhandled log line", tabs);
  return [];
}
