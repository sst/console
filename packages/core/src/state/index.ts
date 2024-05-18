import { z } from "zod";
import { zod } from "../util/zod";
import { stateUpdateTable, stateResourceTable, Source } from "./state.sql";
import { createTransaction, useTransaction } from "../util/transaction";
import { createId } from "@paralleldrive/cuid2";
import { DateTime } from "luxon";
import { useWorkspace } from "../actor";
import { and, eq, sql } from "drizzle-orm";
import { event } from "../event";
import { createSelectSchema } from "drizzle-zod";
import { Stage, StageCredentials } from "../app/stage";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { RETRY_STRATEGY } from "../util/aws";
import { AWS } from "../aws";

export module State {
  export const Event = {
    LockCreated: event(
      "state.lock.created",
      z.object({ stageID: z.string(), versionID: z.string() })
    ),
  };

  export const Update = createSelectSchema(stateUpdateTable, {
    source: Source,
  });

  export const getLock = zod(
    z.object({
      versionID: z.string(),
      config: z.custom<StageCredentials>(),
    }),
    async (input) => {
      const s3 = new S3Client({
        ...input.config,
        retryStrategy: RETRY_STRATEGY,
      });
      const bootstrap = await AWS.Account.bootstrapIon(input.config);
      if (!bootstrap) return;
      const obj = await s3.send(
        new GetObjectCommand({
          Bucket: bootstrap.bucket,
          Key: ["lock", input.config.app, input.config.stage].join("/"),
          VersionId: input.versionID,
        })
      );
      const jsonData = JSON.parse(await obj.Body!.transformToString()) as {
        updateID: string;
        command: string;
        created: string;
      };
      return jsonData;
    }
  );

  export const createUpdate = zod(
    Update.pick({
      id: true,
      stageID: true,
      source: true,
      command: true,
    }),
    (input) =>
      useTransaction((tx) =>
        tx.insert(stateUpdateTable).ignore().values({
          id: input.id,
          stageID: input.stageID,
          workspaceID: useWorkspace(),
          source: input.source,
          command: input.command,
        })
      )
  );

  export const startDeployment = zod(
    Update.pick({ id: true, timeStarted: true }).required({
      timeStarted: true,
    }),
    (input) =>
      useTransaction(async (tx) =>
        tx
          .update(stateUpdateTable)
          .set({
            timeStarted: input.timeStarted,
          })
          .where(
            and(
              eq(stateUpdateTable.id, input.id),
              eq(stateUpdateTable.workspaceID, useWorkspace())
            )
          )
      )
  );

  export const sync = zod(
    z.object({
      stageID: z.string(),
      checkpoint: z.any(),
    }),
    async (input) =>
      createTransaction(async (tx) => {
        const existing = await tx
          .select()
          .from(stateResourceTable)
          .where(
            and(
              eq(stateResourceTable.workspaceID, useWorkspace()),
              eq(stateResourceTable.stageID, input.stageID)
            )
          )
          .then((rows) => new Map(rows.map((row) => [row.urn, row])));
        const inserts = [] as (typeof stateResourceTable.$inferInsert)[];
        for (const resource of input.checkpoint.resources) {
          const timeUpdated = DateTime.fromISO(resource.modified).toSQL()!;
          const match = existing.get(resource.urn);
          existing.delete(resource.urn);
          inserts.push({
            stageID: input.stageID,
            action: (() => {
              if (!match) return "created";
              if (match.action === "deleted") return "created";
              return "updated";
            })(),
            id: createId(),
            timeUpdated,
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
        for (const [_urn, row] of existing) {
          inserts.push({
            stageID: input.stageID,
            action: "deleted",
            id: createId(),
            timeUpdated: DateTime.now().toSQL()!,
            timeCreated: row.timeCreated,
            workspaceID: useWorkspace(),
            type: row.type,
            urn: row.urn,
            custom: row.custom,
            inputs: {},
            outputs: {},
            parent: row.parent,
          });
        }
        await tx.insert(stateResourceTable).ignore().values(inserts);
      })
  );
}
