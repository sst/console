import { provideActor } from "@console/core/actor";
import { App } from "@console/core/app";
import { stage } from "@console/core/app/app.sql";
import { db } from "@console/core/drizzle";

export async function handler() {
  const rows = await db.select().from(stage).execute();
  for (const row of rows) {
    provideActor({
      type: "system",
      properties: {
        workspaceID: row.workspaceID,
      },
    });

    console.log("syncing metadata for", row.appID, row.name);
    await App.Stage.syncMetadata(row.id);
  }
}
