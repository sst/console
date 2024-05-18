import { withActor } from "@console/core/actor";
import { Stage } from "@console/core/app";
import { State } from "@console/core/state";
import { createTransaction } from "@console/core/util/transaction";
import { DateTime } from "luxon";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(State.Event.LockCreated, (evt) =>
  withActor(evt.metadata.actor, async () => {
    console.log("here");
    const config = await Stage.assumeRole(evt.properties.stageID);
    if (!config) return;
    const lock = await State.getLock({
      versionID: evt.properties.versionID,
      config,
    });
    if (!lock) return;
    await createTransaction(async () => {
      await State.createUpdate({
        command: lock.command as any,
        id: lock.updateID,
        stageID: evt.properties.stageID,
        source: {
          type: "cli",
          properties: {},
        },
      });
      await State.startDeployment({
        id: lock.updateID,
        timeStarted: DateTime.fromISO(lock.created).toSQL({
          includeOffset: false,
        })!,
      });
    });
    console.log("got lock", lock);
  })
);
