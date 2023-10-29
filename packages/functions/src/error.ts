import { ApiHandler } from "sst/node/api";

console.log("Cold start!");

export const handler = ApiHandler(async () => {
  console.error("my error", new Error("logged error"));

  return {
    statusCode: 200,
    body: "A".repeat(1024 * 1024 * 10),
  };
});
