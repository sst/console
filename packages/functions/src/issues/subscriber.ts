import zlib from "zlib";
import crypto from "crypto";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { Issue } from "@console/core/issue";
import { chunk } from "remeda";

export const handler = ApiHandler(async (event) => {
  const body = useJsonBody();
  for (const records of chunk(body.records, 100)) {
    await Promise.all(
      records.map(async (record: any) => {
        const decoded = JSON.parse(
          zlib.unzipSync(Buffer.from(record.data, "base64")).toString()
        );
        if (decoded.messageType !== "DATA_MESSAGE") return;
        await Issue.extract(decoded);
      })
    );
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      requestId: body.requestId,
      timestamp: Date.now(),
    }),
  };
});

function handleRecord(record: any) {
  console.log(record);
  const { messageType, logGroup, logStream, subscriptionFilters, logEvents } =
    record;

  if (messageType !== "DATA_MESSAGE") return;

  const [prefix, accountId, app, stage] = subscriptionFilters[0].split("#");

  if (prefix !== "sst") return;

  for (const logEvent of logEvents) {
    const result = parseLogMessage(logEvent.message, logGroup);

    console.log(result?.errorIdentity);

    const errorIdentityHash = crypto
      .createHash("sha256")
      .update(result?.errorIdentity!)
      .digest("hex");
  }
}

/////////////////
// Folling code is just a proof of concept
/////////////////

export function parseLogMessage(
  message: string,
  lambdaStageAgnosticName: string
) {
  // normalize message
  // note: \r\n needs to be listed before \r, otherwise only \r will be replaced
  message = message.trim().replace(/(\r\n|\r)/g, "\n");

  let ret;

  // Lambda Runtime error
  ret = parseLambdaRuntimeError(message, lambdaStageAgnosticName);
  if (ret) return ret;

  // Lambda Timed out
  ret = parseLambdaTimeout(message, lambdaStageAgnosticName);
  if (ret) return ret;

  // Handle Node specific errors
  const lines = message.split("\n");
  if (!lines[0]) return;

  const firstLineTabParts = lines[0].split("\t");
  if (!firstLineTabParts[1] || firstLineTabParts[2] !== "ERROR") return;

  const requestId =
    firstLineTabParts[1].length === 36 ? firstLineTabParts[1] : undefined;

  // Lambda Uncaught error
  ret = parseNodeUncaughtError(message, requestId, lines, firstLineTabParts);
  if (ret) return ret;

  const firstLineMessage = lines[0].split("\t").slice(3).join("\t").trim();

  // Lambda console.error empty
  if (!firstLineMessage) return;

  // Lambda console.error exception
  ret = parseNodeConsoleErrorException(
    message,
    requestId,
    lines,
    firstLineMessage
  );
  if (ret) return ret;

  // Lambda console.error string
  ret = parseNodeConsoleErrorString(
    message,
    requestId,
    lines,
    firstLineMessage
  );
  if (ret) return ret;
}
function parseLambdaRuntimeError(
  message: string,
  lambdaStageAgnosticName: string
) {
  // RequestId: 80925099-25b1-4a56-8f76-e0eda7ebb6d3 Error: Runtime exited with error: signal: aborted (core dumped)
  if (message.startsWith("RequestId: ")) {
    const errorMessage = `${lambdaStageAgnosticName} ${message.substring(63)}`;
    return {
      requestId: message.substring(11, 47),
      errorType: "Lambda Runtime Error",
      errorMessage,
      errorIdentity: errorMessage,
    };
  }
}
function parseLambdaTimeout(message: string, lambdaStageAgnosticName: string) {
  // 2019-11-12T21:02:33.745Z 3df631f5-8d77-4429-a0e5-4ebb9a8714a1 Task timed out after 3.00 seconds
  if (message.substring(62).startsWith("Task timed out after")) {
    return {
      requestId: message.substring(25, 61),
      errorType: "Lambda Timeout Error",
      errorMessage: `${lambdaStageAgnosticName} ${message.substring(67)}`,
      errorIdentity: `${lambdaStageAgnosticName} timed out`,
    };
  }
}

function parseNodeUncaughtError(
  message: string,
  requestId: string | undefined,
  lines: string[],
  firstLineTabParts: string[]
) {
  // Lambda Uncaught error
  // 2020-05-05T11:53:40.759Z	03653dda-78f2-401e-adf0-c2d2a8a60dc5	ERROR	Invoke Error 	{"errorType":"Error","errorMessage":"myError","stack":["Error: myError","    at /var/task/webpack:/tmp/seed/source/services/jobs-domain-create/create-cert.js:77:15","    at processTicksAndRejections (internal/process/task_queues.js:97:5)"]}
  //
  // OR
  //
  // 2020-05-06T10:00:43.100Z	e897bcef-b72c-4a94-ab23-5afb08491a2c	ERROR	Unhandled Promise Rejection 	{"errorType":"Runtime.UnhandledPromiseRejection","errorMessage":"..."}
  if (lines.length === 1 && firstLineTabParts.length >= 5) {
    try {
      const errorObject = JSON.parse(
        firstLineTabParts.slice(4).join("\t").trim()
      );
      let errorType;
      let errorMessage;
      let errorStackTrace;
      // sub case 1: errorObject is {
      //    "errorType": "...",
      //    "errorMessage": "...",
      //    "reason": {
      //      "errorType": "ValidationException",
      //      "errorMessage": "Provided list of item keys contains duplicates",
      //      "stack": [ ... ]
      //    }
      // }
      if (errorObject.reason && errorObject.reason.errorType) {
        errorType = errorObject.reason.errorType;
        errorMessage = errorObject.reason.errorMessage;
        errorStackTrace = errorObject.reason.stack || errorObject.reason.trace;
      } else {
        errorType = errorObject.errorType;
        errorMessage = errorObject.errorMessage;
        errorStackTrace = errorObject.stack || errorObject.trace;
      }

      // Handle errorMessage is an object
      errorMessage =
        typeof errorMessage === "string"
          ? errorMessage
          : JSON.stringify(errorMessage);
      // clean up errorMessage Require stack
      if (errorMessage) {
        let isReqiureStack: boolean;
        errorMessage = errorMessage
          .split("\n")
          .filter((line) => {
            isReqiureStack = isReqiureStack || line === "Require stack:";
            return !isReqiureStack;
          })
          .join("\n");
      }

      // Handle errorStackTrace is a string
      errorStackTrace =
        typeof errorStackTrace === "string"
          ? errorStackTrace.split("\n")
          : errorStackTrace;

      if (!errorType && errorStackTrace) {
        const errorInfo = parseNodeErrorInfoFromStackTrace(errorStackTrace);
        errorType = errorInfo.errorType;
        errorMessage = errorInfo.errorMessage;
      }
      return {
        requestId,
        errorType,
        errorMessage,
        errorStackTrace: errorStackTrace.join("\n").trim(),
        errorIdentity: generateNodeErrorIdentity(
          errorType,
          errorMessage!,
          errorStackTrace
        ),
      };
    } catch (e) {
      console.log(e);
    }
  }
}
function parseNodeConsoleErrorException(
  message: string,
  requestId: string | undefined,
  lines: string[],
  firstLineMessage: string
) {
  // Case 1:
  // 2020-05-05T01:23:46.244Z	8096b68e-4b49-42f6-a1cf-310ca9c8ee9a	ERROR	MyException: message
  //     at ..
  //     at .. {
  //   message: 'Request ID: 3e70113e-b706-43e1-8e15-0a67c8305d3b)',
  //   code: 'InvalidParameterException',
  //   requestId: '83b7a818-e78a-40dd-81cb-7316d065881d',
  // }
  //
  // OR
  //
  // Case 2:
  // 2020-05-05T01:23:46.244Z	8096b68e-4b49-42f6-a1cf-310ca9c8ee9a	ERROR	{ Error: Cannot find module 'abc'
  //     at ..
  //     at .. code: 'MODULE_NOT_FOUND' }
  //
  const firstStackTraceLine = lines.findIndex((line) =>
    line.trim().startsWith("at ")
  );
  const hasStackTrace = firstStackTraceLine > -1;
  if (!hasStackTrace) {
    return;
  }

  const firstLineColonParts = firstLineMessage.split(":");
  const firstLineBeforeColon = firstLineColonParts[0] || "";
  const firstLineAfterColon = firstLineColonParts.slice(1).join(":");

  // Build errorType
  let errorType = firstLineBeforeColon.trim();
  // clean up errorType case: 'Error [MyError]: ...'
  const errorTypeMatches = errorType.match(/^Error \[([^\[\]]+)\]$/);
  if (errorTypeMatches && errorTypeMatches.length === 2) {
    errorType = errorTypeMatches[1]!;
  }
  // clean up errorType case: '{ Error: ...' (ie. Case 2)
  if (errorType.startsWith("{ ")) {
    errorType = errorType.substring(2);
  }

  // Build errorMessage
  let isReqiureStack: boolean;
  let errorMessages = [
    firstLineAfterColon,
    ...lines.slice(1, firstStackTraceLine),
  ];
  // clean up errorMessage Require stack
  errorMessages = errorMessages.filter((line) => {
    isReqiureStack = isReqiureStack || line === "Require stack:";
    return !isReqiureStack;
  });
  const errorMessage = errorMessages.join("\n");

  // Build errorStackTrace
  const errorStackTrace = [firstLineMessage, ...lines.slice(1)];
  return {
    requestId,
    errorType: errorType || "Error",
    errorMessage: errorMessage.trim() || undefined,
    errorStackTrace: errorStackTrace.join("\n").trim(),
    errorIdentity: generateNodeErrorIdentity(
      errorType,
      errorMessage,
      errorStackTrace
    ),
  };
}
function parseNodeConsoleErrorString(
  message: string,
  requestId: string | undefined,
  lines: string[],
  firstLineMessage: string
) {
  // 2020-05-05T01:23:46.244Z	8096b68e-4b49-42f6-a1cf-310ca9c8ee9a	ERROR	this is an error
  //
  // OR
  //
  // 2020-05-11T12:57:54.015Z	c475aa01-d4bc-4c92-a989-e021bca89ebe	ERROR	{
  //   error: {
  //     headers: undefined,
  //     name: 8006,
  //     code: undefined,
  //     message: 'seed-jobs-ghe-proxy-prod-invokeGitlab - 8006'
  //   }
  // }
  const errorBody = [firstLineMessage, ...lines.slice(1)].join("\n").trim();

  let errorType = "Error";
  let errorMessage = errorBody;
  let errorIdentity = errorBody;

  // Handle Node Warning
  // ie. (node:7) DeprecationWarning: api is deprecated
  // ie. (node:9) MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
  const ret = isNodeWarning(errorBody);
  if (ret) {
    errorType = ret[2]!; // DeprecationWarning
    errorMessage = ret[3]!; // api is deprecated
    errorIdentity = ret[1]!; // DeprecationWarning: api is deprecated
  }

  return { requestId, errorType, errorMessage, errorIdentity };
}

export function parseNodeErrorInfoFromStackTrace(stack: string[]) {
  // Validate is stack trace
  const firstStackTraceLine = stack.findIndex((line) =>
    line.trim().startsWith("at ")
  );
  if (firstStackTraceLine === -1) {
    return {};
  }

  const firstLine = stack[0]!;
  const firstLineColonParts = firstLine.split(":");
  const firstLineBeforeColon = firstLineColonParts[0]!.trim();
  const firstLineAfterColon = firstLineColonParts.slice(1).join(":").trim();

  // handle errorType = 'Error [MyError]'
  let errorType = firstLineBeforeColon.trim();
  const errorTypeMatches = errorType.match(/^Error \[([^\[\]]+)\]$/);
  if (errorTypeMatches && errorTypeMatches.length === 2) {
    errorType = errorTypeMatches[1]!;
  }

  let errorMessage = [
    firstLineAfterColon,
    ...stack.slice(1, firstStackTraceLine),
  ].join("\n");

  return { errorType, errorMessage };
}
export function generateNodeErrorIdentity(
  type: string,
  message: string,
  stack: string[]
) {
  // Use stack
  // - include
  // '  at IncomingMessage.onEnd (/var/runtime/node_modules/aws-sdk/lib/event_listeners.js:307:13)'
  // '  at /var/task/webpack:/tmp/seed/source/node_modules/async-listener/glue.js:188:1'
  // '  at Runtime.module.exports.main [as handler] (/var/task/handler.js:45:17)'
  // - exclude
  // '  at IncomingMessage.emit (events.js:322:22)'
  let stackWithAt = stack
    .map((line) => {
      // ^
      // \s*at\s+
      // (?:(\S*)\s+)?          - module name
      // (?:.*\s)?              - gibberish, ie. [as handler]
      // \(?(\/.*):\d+:\d+\)?   - file with line number
      // (?: {)?                - followed by curly bracket
      // $
      const ret = line.match(
        /^\s*at\s+(?:(\S*)\s+)?(?:.*\s)?\(?(\/.*):\d+:\d+\)?/
      );
      if (ret && ret.length === 3) {
        return ret.slice(1).join(" ").trim();
      }
      return;
    })
    .filter((line) => line);
  if (stackWithAt.length > 0) {
    if (type && type !== "") {
      stackWithAt = [type, ...stackWithAt];
    }
    return stackWithAt.join("\n").trim();
  }

  // Use type
  if (type && type !== "") {
    return type;
  }

  // Use message
  return message;
}
export function isNodeWarning(errorMessage: string) {
  // Examples:
  // (node:8) [DEP0005] DeprecationWarning: ... => [DEP0005] DeprecationWarning: ...
  // (node:7) DeprecationWarning: ...           => DeprecationWarning: ...
  return errorMessage.match(
    /^(?:\(node:\d+\) )(((?:\[.*\] )?(?:DeprecationWarning|MaxListenersExceededWarning)): (.*))/
  );
}
