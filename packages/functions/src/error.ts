import { ApiHandler } from "sst/node/api";
export const handler = ApiHandler(async () => {
  console.error(new Error("logged error 3"));
  console.error(new Error("logged error 4"));
  console.error(new Error("logged error 5"));
  console.error(new Error("logged error 6"));
  console.error(new Error("logged error 7"));
  return {
    statusCode: 200,
    body: "ok",
  };
});
