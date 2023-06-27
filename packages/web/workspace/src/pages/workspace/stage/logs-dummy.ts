import { Invocation } from "$/data/log";

export const DUMMY_LOGS: Invocation[] = [
  {
    id: crypto.randomUUID(),
    logs: [
      {
        message: "start of log",
        timestamp: new Date(),
      },
    ],
    cold: true,
    start: new Date(),
    duration: 234,
  },
];
