import { provideActor } from "@console/core/actor";
import { EventHandler } from "./handler";
import { Stage } from "@console/core/app/stage";
import { AWS } from "@console/core/aws";

export const handler = EventHandler(
  Stage.Events.Connected,
  async (properties, actor) => {
  throw new Error("foo");
    provideActor(actor);
    const stage = await Stage.fromID(properties.stageID);
    const account = await AWS.Account.fromID(stage!.awsAccountID);
    const credentials = await AWS.assumeRole(account!.accountID);
    await AWS.Account.integrate({
      credentials,
      region: stage!.region,
    });
    await Stage.syncMetadata(properties.stageID);
  }
);
