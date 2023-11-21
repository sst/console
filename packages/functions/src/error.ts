import { ApiHandler } from "sst/node/api";
export const handler = ApiHandler(async () => {
  console.error(new Error("logged error 3"));
  return {
    statusCode: 200,
    body: "ok",
  };
});
