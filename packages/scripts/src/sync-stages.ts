import { provideActor } from "@console/core/actor";
import { db } from "@console/core/drizzle";
import { stage } from "@console/core/app/app.sql";
import { Stage } from "@console/core/app";

const stages = await db.select().from(stage).execute();

for (const stage of stages) {
  provideActor({
    type: "system",
    properties: {
      workspaceID: stage.workspaceID,
    },
  });
  await Stage.Events.Updated.publish({
    stageID: stage.id,
  });
}

export {};
