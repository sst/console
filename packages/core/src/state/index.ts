import { z } from "zod";
import { zod } from "../util/zod";
import {
  stateUpdateTable,
  stateResourceTable,
  Source,
  UpdateCommand,
} from "./state.sql";
import { createTransaction, useTransaction } from "../util/transaction";
import { createId } from "@paralleldrive/cuid2";
import { DateTime } from "luxon";
import { useWorkspace } from "../actor";
import { and, eq, sql } from "drizzle-orm";
import { event } from "../event";
import { createSelectSchema } from "drizzle-zod";
import { Stage, StageCredentials } from "../app/stage";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { RETRY_STRATEGY } from "../util/aws";
import { AWS } from "../aws";

export module State {
  export const Event = {
    LockCreated: event(
      "state.lock.created",
      z.object({ stageID: z.string(), versionID: z.string() })
    ),
    LockRemoved: event(
      "state.lock.removed",
      z.object({ stageID: z.string(), versionID: z.string() })
    ),
    SummaryCreated: event(
      "state.summary.created",
      z.object({ stageID: z.string(), updateID: z.string() })
    ),
    HistoryCreated: event(
      "state.history.created",
      z.object({ stageID: z.string(), key: z.string() })
    ),
  };

  export const Update = createSelectSchema(stateUpdateTable, {
    source: Source,
  });

  export const receiveHistory = zod(
    z.object({
      key: z.string(),
      config: z.custom<StageCredentials>(),
    }),
    async (input) => {
      const updateID = input.key
        .split("/")
        .at(-1)!
        .split(".")[0]!
        .split("-")[1]!;
      console.log("receiveHistory", { updateID });
      const s3 = new S3Client({
        ...input.config,
        retryStrategy: RETRY_STRATEGY,
      });
      const bootstrap = await AWS.Account.bootstrapIon(input.config);
      if (!bootstrap) return;
      console.log("processing", input.key);
      const state = await s3
        .send(
          new GetObjectCommand({
            Bucket: bootstrap.bucket,
            Key: input.key,
          })
        )
        .then(
          async (result) =>
            JSON.parse(await result.Body!.transformToString()).checkpoint.latest
        )
        .catch(() => {});
      if (!state) return;
      let continueToken: string | undefined;
      const previousKey = await s3
        .send(
          new ListObjectsV2Command({
            Bucket: bootstrap.bucket,
            Prefix: `history/${input.config.app}/${input.config.stage}/`,
            StartAfter: input.key,
            ContinuationToken: continueToken,
          })
        )
        .then((result) => result.Contents?.[0]?.Key);
      let previousState = {
        resources: [],
      };
      if (previousKey) {
        previousState = await s3
          .send(
            new GetObjectCommand({
              Bucket: bootstrap.bucket,
              Key: previousKey,
            })
          )
          .then(
            async (result) =>
              JSON.parse(await result.Body!.transformToString()).checkpoint
                .latest
          );
        console.log("found previous", previousKey);
      }

      const resources = Object.fromEntries(
        state.resources.map((r: any) => [r.urn, r])
      );
      const previousResources = Object.fromEntries(
        previousState.resources.map((r: any) => [r.urn, r])
      );

      const inserts = [] as (typeof stateResourceTable.$inferInsert)[];
      for (const [urn, resource] of Object.entries(resources)) {
        const previous = previousResources[urn];
        delete previousResources[urn];
        if (previous && previous.modified === resource.modified) continue;
        delete resource.inputs["__provider"];
        delete resource.outputs["__provider"];
        inserts.push({
          stageID: input.config.stageID,
          updateID,
          action: (() => {
            if (!previous) return "created";
            if (previous.action === "deleted") return "created";
            return "updated";
          })(),
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

      for (const urn of Object.keys(previousResources)) {
        const resource = previousResources[urn];
        inserts.push({
          stageID: input.config.stageID,
          updateID,
          action: "deleted",
          id: createId(),
          timeUpdated: DateTime.now().toSQL()!,
          timeCreated: resource.created,
          workspaceID: useWorkspace(),
          type: resource.type,
          urn: resource.urn,
          custom: resource.custom,
          inputs: {},
          outputs: {},
          parent: resource.parent,
        });
      }
      console.log("inserting", inserts);
      await useTransaction(async (tx) => {
        await tx.insert(stateResourceTable).ignore().values(inserts);
      });
    }
  );

  export const receiveLock = zod(
    z.object({
      versionID: z.string(),
      config: z.custom<StageCredentials>(),
    }),
    async (input) => {
      console.log("receiveLock");
      const s3 = new S3Client({
        ...input.config,
        retryStrategy: RETRY_STRATEGY,
      });
      const bootstrap = await AWS.Account.bootstrapIon(input.config);
      if (!bootstrap) return;
      const obj = await s3.send(
        new GetObjectCommand({
          Bucket: bootstrap.bucket,
          Key:
            ["lock", input.config.app, input.config.stage].join("/") + ".json",
          VersionId: input.versionID,
        })
      );
      const lock = JSON.parse(await obj.Body!.transformToString()) as {
        updateID: string;
        command: string;
        created: string;
      };
      if (!lock.updateID) return;
      if (!lock.command) return;
      if (!lock.created) return;
      const command = UpdateCommand.safeParse(lock.command);
      if (!command.success) return;
      await useTransaction(async (tx) => {
        await tx.insert(stateUpdateTable).values({
          workspaceID: useWorkspace(),
          command: command.data,
          id: lock.updateID,
          stageID: input.config.stageID,
          source: {
            type: "cli",
            properties: {},
          },
          timeStarted: DateTime.fromISO(lock.created).toSQL({
            includeOffset: false,
          })!,
        });
      });
    }
  );

  export const receiveSummary = zod(
    z.object({
      updateID: z.string(),
      config: z.custom<StageCredentials>(),
    }),
    async (input) => {
      console.log("receive summary", input.updateID);
      const s3 = new S3Client({
        ...input.config,
        retryStrategy: RETRY_STRATEGY,
      });
      const bootstrap = await AWS.Account.bootstrapIon(input.config);
      if (!bootstrap) return;
      const obj = await s3.send(
        new GetObjectCommand({
          Bucket: bootstrap.bucket,
          Key:
            [
              "summary",
              input.config.app,
              input.config.stage,
              input.updateID,
            ].join("/") + ".json",
        })
      );
      const summary = JSON.parse(await obj.Body!.transformToString()) as {
        updateID: string;
        resourceUpdated: number;
        resourceCreated: number;
        resourceDeleted: number;
        resourceSame: number;
        timeStarted: string;
        timeCompleted: string;
      };
      console.log({ summary });
      await useTransaction(async (tx) => {
        await tx
          .update(stateUpdateTable)
          .set({
            resourceUpdated: summary.resourceUpdated,
            resourceCreated: summary.resourceCreated,
            resourceDeleted: summary.resourceDeleted,
            resourceSame: summary.resourceSame,
            timeStarted: DateTime.fromISO(summary.timeStarted).toSQL({
              includeOffset: false,
            })!,
            timeCompleted: DateTime.fromISO(summary.timeCompleted).toSQL({
              includeOffset: false,
            })!,
          })
          .where(
            and(
              eq(stateUpdateTable.workspaceID, useWorkspace()),
              eq(stateUpdateTable.id, input.updateID)
            )
          );
      });
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

  export const startUpdate = zod(
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
            timeUpdated: DateTime.fromISO(resource.modeified).toSQL()!,
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
