import { awsAccount } from "@console/core/aws/aws.sql";
import { provideActor } from "@console/core/actor";
import { db, inArray } from "@console/core/drizzle";
import { stage } from "@console/core/app/app.sql";
import { App } from "@console/core/app";

const workspaceFilter: string[] = ["poarsnbzhimh69bl22qxpbeq"];

const stages = await db
  .select()
  .from(stage)
  .where(
    workspaceFilter.length
      ? inArray(stage.workspaceID, workspaceFilter)
      : undefined
  )
  .execute();

const promises = [];
for (const stage of stages) {
  provideActor({
    type: "system",
    properties: {
      workspaceID: stage.workspaceID,
    },
  });
  for (let i = 1; i < 16; i++) {
    promises.push(
      App.Stage.Events.UsageRequested.publish({
        stageID: stage.id,
        daysOffset: i,
      })
    );
  }
}
await Promise.all(promises);
