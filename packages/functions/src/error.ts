import { ApiHandler } from "sst/node/api";

export const handler = ApiHandler(async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (Math.random() > 0.5) throw new Error("some stupid error");
});
