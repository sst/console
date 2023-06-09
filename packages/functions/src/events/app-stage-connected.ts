import { provideActor } from "@console/core/actor";
import { Stage } from "@console/core/app/stage";
import { AWS } from "@console/core/aws";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(
  Stage.Events.Connected,
  async (properties, metadata) => {
    provideActor(metadata.actor);
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
