import { Invocation } from "$/data/log";

export const DUMMY_LOGS: Invocation[] = [
  {
    id: crypto.randomUUID(),
    logs: [],
    cold: false,
    start: new Date(),
    duration: undefined,
  },
  {
    id: crypto.randomUUID(),
    logs: [
      {
        message: "start of log",
        timestamp: new Date("1995-12-17T01:24:00"),
      },
      {
        message:
          "middle of log but this is going to be a really long log line that should overflow because it's too long and it won't fit in the box and it really keeps going on and on and on.",
        timestamp: new Date("1995-12-17T10:24:00"),
      },
      {
        message: `{ "baseBranch": "master", "pipeline": { "build": { "dependsOn": ["^build", "clean", "cdk-version-check"], "outputs": ["dist"] }, "cdk-version-check": {}, "clean": { "dependsOn": ["^clean"] }, "test": { "dependsOn": ["^test", "^build"] } } }`,
        timestamp: new Date("1995-12-17T10:24:00"),
      },
      {
        message: "end of log",
        timestamp: new Date(),
      },
    ],
    cold: false,
    start: new Date(),
    duration: 234,
  },
  {
    id: crypto.randomUUID(),
    logs: [
      {
        message: "slow log start",
        timestamp: new Date(),
      },
      {
        message: "slow log end",
        timestamp: new Date(),
      },
    ],
    cold: true,
    start: new Date(),
    duration: 34161,
  },
  {
    id: crypto.randomUUID(),
    logs: [
      {
        message: "error message",
        timestamp: new Date(),
      },
    ],
    cold: false,
    error: true,
    start: new Date(),
    duration: 234161,
  },
];
