import { workspace } from "@console/core/workspace/workspace.sql";
import { db } from "@console/core/drizzle";

process.env.EVENT_BUS_ARN =
  "arn:aws:events:us-east-1:226609089145:event-bus/production-console-bus";
const workspaces = await db.select().from(workspace).execute();
