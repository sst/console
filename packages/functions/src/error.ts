import { ApiHandler } from "sst/node/api";

console.log("Cold start!");

export const handler = ApiHandler(async () => {
  console.log("counting down...");
  console.error("my error", new Error("logged error"));
  throw new Error("some stupid error");
});
