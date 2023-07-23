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
        timestamp: new Date("1995-12-17T01:24:00"),
      },
      {
        message:
          "middle of log but this is going to be a really long log line that should overflow because it's too long and it won't fit in the box and it really keeps going on and on and on.",
        timestamp: new Date("1995-12-17T10:24:00"),
      },
      {
        message: `eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiYWNjb3VudCIsInByb3BlcnRpZXMiOnsiYWNjb3VudElEIjoicGRpaWR4eTZpenB2NndtZGQ0NjZtcm1kIiwiZW1haWwiOiJhaXJAbGl2ZS5jYSJ9LCJpYXQiOjE2ODQ0MzA3MTl9.cNrbo79sNZoh6zJBFv5lkaAr8KpUECHbG0SFwBHg6ziq4EOBS-J-Pmd2pGCvyRO3-AoqBMAFfjV924kpuQjdvgjDNDqXzPphemYQ0kA3SMLFYn_EZBchscKm-v57OVB7pKHKYIEr0i1jHoA9O_cNqV8hleWFPSOrVa8JBnjNXi2KFMl1G-11CrGZPDbWURtur5lpvprJa7dHxnKR8YqtHpYQ7jBHJsc2ryZyKfnpMncCoMMRn5RhIu33hTDO4r8DxAkUgQnVjswXGPJPLtNvVUFKaNT-y5r4R6WLC_J7gM4seNZWyOViqiuizNOuNp6kIWq4-CggBq7GnX1p5KHHAA`,

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
        message:
          "start of log but this is going to be a really long log line that should overflow because it's too long and it won't fit in the box and it really keeps going on and on and on.",
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
    error: {
      type: "Error",
      message: "Error message",
      trace: [],
    },
    start: new Date(),
    duration: 234161,
  },
];
