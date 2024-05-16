import { z } from "zod";
import { zod } from "../util/zod";
import { App } from "../app";
import { stateResourceTable } from "./state.sql";
import { createTransaction, useTransaction } from "../util/transaction";
import { createId } from "@paralleldrive/cuid2";
import { DateTime } from "luxon";
import { useWorkspace } from "../actor";

export module State {
  export const sync = zod(
    z.object({
      stageID: z.string(),
      checkpoint: z.any(),
    }),
    async (input) =>
      createTransaction(async (tx) => {
        const inserts = [] as (typeof stateResourceTable.$inferInsert)[];
        for (const resource of input.checkpoint.resources) {
          inserts.push({
            stageID: input.stageID,
            id: createId(),
            timeUpdated: DateTime.fromISO(resource.modified).toSQL()!,
            timeCreated: DateTime.fromISO(resource.created).toSQL()!,
            workspaceID: useWorkspace(),
            type: resource.type,
            urn: resource.urn,
            custom: resource.boolean,
            inputs: resource.inputs || {},
            outputs: resource.outputs || {},
            parent: resource.parent,
          });
        }
        await tx.insert(stateResourceTable).ignore().values(inserts);
      }),
  );
}
