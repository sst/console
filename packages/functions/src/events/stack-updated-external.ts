import { provideActor } from "@console/core/actor";
import { Stage } from "@console/core/app";
import { app, stage } from "@console/core/app/app.sql";
import { awsAccount } from "@console/core/aws/aws.sql";
import { db } from "@console/core/drizzle";
import { and, eq } from "drizzle-orm";

interface Events {
  "Object Created": {
    bucket: {
      name: string;
    };
    object: {
      key: string;
    };
  };
}

type Payload = {
  [key in keyof Events]: {
    account: string;
    "detail-type": key;
    detail: Events[key];
  };
}[keyof Events];

export const handler = async (evt: Payload) => {
  if (evt["detail-type"] === "Object Created") {
    if (!evt.detail.object.key.startsWith("stackMetadata")) return;
    const [, appHint, stageHint] = evt.detail.object.key.split("/");
    if (!stageHint || !appHint) return;
    const [, stageName] = stageHint?.split(".");
    const [, appName] = appHint?.split(".");
    const { account } = evt;

    const rows = await db
      .select({
        stageID: stage.id,
        workspaceID: stage.workspaceID,
      })
      .from(stage)
      .leftJoin(app, eq(stage.appID, app.id))
      .leftJoin(awsAccount, eq(stage.awsAccountID, awsAccount.id))
      .where(
        and(
          eq(stage.name, stageName!),
          eq(app.name, appName!),
          eq(awsAccount.accountID, account)
        )
      )
      .execute();

    for (const row of rows) {
      provideActor({
        type: "system",
        properties: {
          workspaceID: row.workspaceID,
        },
      });
      await Stage.Events.Updated.publish({
        stageID: row.stageID,
      });
    }
  }
};
