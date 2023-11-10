import { ApiHandler } from "sst/node/api";
export const handler = ApiHandler(async () => {
  console.error(new Error("logged error 1"));
  console.error(new Error("logged error 2"));
  console.error(new Error("logged error 3"));
  console.error(new Error("logged error 4"));
  return {
    statusCode: 200,
    body: "A".repeat(1024 * 1024 * 10),
  };
});
