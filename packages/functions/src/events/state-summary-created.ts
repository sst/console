import { withActor } from "@console/core/actor";
import { Stage } from "@console/core/app";
import { State } from "@console/core/state";
import { createTransaction } from "@console/core/util/transaction";
import { DateTime } from "luxon";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(State.Event.SummaryCreated, (evt) =>
  withActor(evt.metadata.actor, async () => {
    const config = await Stage.assumeRole(evt.properties.stageID);
    if (!config) return;
    await State.receiveSummary({
      updateID: evt.properties.updateID,
      config,
    });
  })
);
