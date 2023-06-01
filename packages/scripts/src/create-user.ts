import { workspace } from "@console/core/workspace/workspace.sql";
import { db } from "@console/core/drizzle";

const workspaces = await db.select().from(workspace).execute();
