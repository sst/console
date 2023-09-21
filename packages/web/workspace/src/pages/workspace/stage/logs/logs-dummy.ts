import { Invocation } from "@console/core/log";
import { func } from "../dummy";

export const DUMMY_FUNC = func("index", "packages/function.handler");

export const DUMMY_LOGS: Invocation[] = [
  {
    id: crypto.randomUUID(),
    source: "dummy",
    logs: [],
    cold: false,
    start: new Date().getTime(),
    errors: [],
  },
  {
    source: "dummy",
    id: crypto.randomUUID(),
    logs: [
      {
        id: crypto.randomUUID(),
        // Test fomatting
        message: `vR {
  cmd: 'connack',
  retain: false,
  qos: 0,
  dup: false,
  length: 2,
  topic: null,
  payload: null,
  sessionPresent: false,
  returnCode: 0
}
        `,
        timestamp: new Date("1995-12-17T01:24:00").getTime(),
      },
      {
        id: crypto.randomUUID(),
        message:
          "middle of log but this is going to be a really long log line that should overflow because it's too long and it won't fit in the box and it really keeps going on and on and on.",
        timestamp: new Date("1995-12-17T10:24:00").getTime(),
      },
      {
        id: Math.random().toString(),
        message: `eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiYWNjb3VudCIsInByb3BlcnRpZXMiOnsiYWNjb3VudElEIjoicGRpaWR4eTZpenB2NndtZGQ0NjZtcm1kIiwiZW1haWwiOiJhaXJAbGl2ZS5jYSJ9LCJpYXQiOjE2ODQ0MzA3MTl9.cNrbo79sNZoh6zJBFv5lkaAr8KpUECHbG0SFwBHg6ziq4EOBS-J-Pmd2pGCvyRO3-AoqBMAFfjV924kpuQjdvgjDNDqXzPphemYQ0kA3SMLFYn_EZBchscKm-v57OVB7pKHKYIEr0i1jHoA9O_cNqV8hleWFPSOrVa8JBnjNXi2KFMl1G-11CrGZPDbWURtur5lpvprJa7dHxnKR8YqtHpYQ7jBHJsc2ryZyKfnpMncCoMMRn5RhIu33hTDO4r8DxAkUgQnVjswXGPJPLtNvVUFKaNT-y5r4R6WLC_J7gM4seNZWyOViqiuizNOuNp6kIWq4-CggBq7GnX1p5KHHAA`,

        timestamp: new Date("1995-12-17T10:24:00").getTime(),
      },
      {
        id: crypto.randomUUID(),
        message: "end of log",
        timestamp: new Date().getTime(),
      },
    ],
    cold: false,
    start: new Date().getTime(),
    errors: [],
  },
  {
    source: "dummy",
    id: crypto.randomUUID(),
    logs: [
      {
        id: crypto.randomUUID(),
        message:
          "start of log but this is going to be a really long log line that should overflow because it's too long and it won't fit in the box and it really keeps going on and on and on.",
        timestamp: new Date().getTime(),
      },
      {
        id: crypto.randomUUID(),
        message: "slow log end",
        timestamp: new Date().getTime(),
      },
    ],
    cold: true,
    start: new Date("1995-12-17T12:24:00").getTime(),
    errors: [],
  },
  {
    id: crypto.randomUUID(),
    source: "dummy",
    logs: [
      {
        id: crypto.randomUUID(),
        message: "Test formatting time, minutes, rounded to nearest second",
        timestamp: new Date().getTime(),
      },
    ],
    cold: false,
    start: new Date("1995-12-17T12:24:00").getTime(),
    errors: [],
  },
  {
    source: "dummy",
    id: crypto.randomUUID(),
    logs: [
      {
        id: crypto.randomUUID(),
        message: "Test formatting time, hours, hh:mm",
        timestamp: new Date().getTime(),
      },
    ],
    cold: false,
    start: new Date("1995-12-17T12:24:00").getTime(),
    errors: [],
  },
  {
    id: crypto.randomUUID(),
    source: "dummy",
    logs: [
      {
        id: crypto.randomUUID(),
        message: "error message",
        timestamp: new Date().getTime(),
      },
    ],
    cold: false,
    errors: [
      {
        id: "1",
        error: "Error",
        message: "Error message",
        stack: [],
      },
    ],
    start: new Date().getTime(),
  },
];
