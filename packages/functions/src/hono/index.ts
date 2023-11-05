import { Hono } from "hono";
import { handle } from "hono/aws-lambda";

const app = new Hono();

app.get("/", async (c) => {
  const mod = await import("./test");
  return mod.default(c);
});

export const handler = handle(app);
