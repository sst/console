import { provideActor } from "@console/core/actor";
import { db } from "@console/core/drizzle";
import { stage } from "@console/core/app/app.sql";
import { Stage } from "@console/core/app";

const workspaceFilter: string[] = ["dw7tloxovs606hoggkpruh2a"];
const stages = await db.select().from(stage).execute();

for (const stage of stages) {
  if (workspaceFilter.length && !workspaceFilter.includes(stage.workspaceID))
    continue;
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
