import { z } from "zod";
import { zod } from "../util/zod";
import {
  stateUpdateTable,
  stateEventTable,
  Source,
  Action,
  UpdateCommand,
  Command,
  stateResourceTable,
} from "./state.sql";
import { createTransactionEffect, useTransaction } from "../util/transaction";
import { createId } from "@paralleldrive/cuid2";
import { useWorkspace } from "../actor";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { event } from "../event";
import { StageCredentials } from "../app/stage";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { RETRY_STRATEGY } from "../util/aws";
import { AWS } from "../aws";
import { Replicache } from "../replicache";

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

  export const Update = z.object({
    id: z.string().cuid2(),
    index: z.number(),
    stageID: z.string().cuid2(),
    command: z.enum(Command),
    source: Source,
    time: z.object({
      created: z.string(),
      deleted: z.string().optional(),
      updated: z.string(),
      started: z.string().optional(),
      completed: z.string().optional(),
    }),
    resource: z.object({
      created: z.number().optional(),
      updated: z.number().optional(),
      deleted: z.number().optional(),
      same: z.number().optional(),
    }),
    errors: z.number().optional(),
  });
  export type Update = z.infer<typeof Update>;

  export const Resource = z.object({
    id: z.string().cuid2(),
    stageID: z.string().cuid2(),
    updateID: z.string().cuid2(),
    type: z.string(),
    urn: z.string(),
    outputs: z.any(),
    inputs: z.any(),
    parent: z.string().optional(),
    custom: z.any().optional(),
    time: z.object({
      created: z.string(),
      deleted: z.string().optional(),
      updated: z.string(),
      stateCreated: z.string().optional(),
      stateModified: z.string().optional(),
    }),
  });
  export type Resource = z.infer<typeof Resource>;

  export const ResourceEvent = Resource.extend({
    action: z.enum(Action),
  });
  export type ResourceEvent = z.infer<typeof ResourceEvent>;

  export function serializeUpdate(
    input: typeof stateUpdateTable.$inferSelect
  ): Update {
    return {
      id: input.id,
      index: input.index || 1,
      command: input.command,
      resource: {
        same: input.resourceSame || undefined,
        created: input.resourceCreated || undefined,
        updated: input.resourceUpdated || undefined,
        deleted: input.resourceDeleted || undefined,
      },
      time: {
        created: input.timeCreated.toISOString(),
        updated: input.timeUpdated.toISOString(),
        deleted: input.timeDeleted?.toISOString(),
        started: input.timeStarted?.toISOString(),
        completed: input.timeCompleted?.toISOString(),
      },
      source: input.source,
      errors: input.errors || undefined,
      stageID: input.stageID,
    };
  }

  export function serializeEvent(
    input: typeof stateEventTable.$inferSelect
  ): ResourceEvent {
    return {
      ...serializeResource(input),
      action: input.action,
    };
  }

  export function serializeResource(
    input: typeof stateResourceTable.$inferSelect
  ): Resource {
    return {
      id: input.id,
      type: input.type,
      time: {
        created: input.timeCreated.toISOString(),
        updated: input.timeUpdated.toISOString(),
        deleted: input.timeDeleted?.toISOString(),
        stateCreated: input.timeStateCreated?.toISOString(),
        stateModified: input.timeStateModified?.toISOString(),
      },
      stageID: input.stageID,
      custom: input.custom,
      updateID: input.updateID,
      urn: input.urn,
      inputs: input.inputs,
      parent: input.parent || undefined,
      outputs: input.outputs,
    };
  }

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
          )
          .catch(() => ({}));
        console.log("found previous", previousKey);
      }
      if (!previousState.resources) previousState.resources = [];

      const resources = Object.fromEntries(
        state.resources.map((r: any) => [r.urn, r])
      );
      const previousResources = Object.fromEntries(
        previousState.resources.map((r: any) => [r.urn, r])
      );

      const eventInserts = [] as (typeof stateEventTable.$inferInsert)[];
      const resourceInserts = [] as (typeof stateResourceTable.$inferInsert)[];
      const resourceDeletes = [] as string[];
      for (const [urn, resource] of Object.entries(resources)) {
        const previous = previousResources[urn];
        delete previousResources[urn];
        resource.inputs = resource.inputs || {};
        resource.outputs = resource.outputs || {};
        delete resource.inputs["__provider"];
        delete resource.outputs["__provider"];
        resourceInserts.push({
          stageID: input.config.stageID,
          updateID,
          id: createId(),
          timeStateModified: resource.modified
            ? new Date(resource.modified)
            : null,
          timeStateCreated: resource.created
            ? new Date(resource.created)
            : null,
          workspaceID: useWorkspace(),
          type: resource.type,
          urn: resource.urn,
          custom: resource.custom,
          inputs: resource.inputs,
          outputs: resource.outputs,
          parent: resource.parent,
        });
        if (!previous || previous.modified !== resource.modified) {
          eventInserts.push({
            ...resourceInserts.at(-1)!,
            action: (() => {
              if (!previous) return "created";
              if (previous.action === "deleted") return "created";
              return "updated";
            })(),
          });
        }
      }

      for (const urn of Object.keys(previousResources)) {
        const resource = previousResources[urn];
        eventInserts.push({
          stageID: input.config.stageID,
          updateID,
          action: "deleted",
          id: createId(),
          workspaceID: useWorkspace(),
          type: resource.type,
          urn: resource.urn,
          custom: resource.custom,
          inputs: {},
          outputs: {},
          parent: resource.parent,
        });
        resourceDeletes.push(resource.urn);
      }
      await useTransaction(async (tx) => {
        await createTransactionEffect(() => Replicache.poke());
        if (eventInserts.length)
          await tx.insert(stateEventTable).ignore().values(eventInserts);
        if (resourceInserts.length)
          await tx
            .insert(stateResourceTable)
            .values(resourceInserts)
            .onDuplicateKeyUpdate({
              set: {
                updateID: sql`VALUES(update_id)`,
                timeStateCreated: sql`VALUES(time_state_created)`,
                timeStateModified: sql`VALUES(time_state_modified)`,
                type: sql`VALUES(type)`,
                custom: sql`VALUES(custom)`,
                inputs: sql`VALUES(inputs)`,
                outputs: sql`VALUES(outputs)`,
                parent: sql`VALUES(parent)`,
              },
            });
        if (resourceDeletes.length)
          await tx
            .delete(stateResourceTable)
            .where(
              and(
                eq(stateResourceTable.workspaceID, useWorkspace()),
                eq(stateResourceTable.stageID, input.config.stageID),
                inArray(stateResourceTable.urn, resourceDeletes)
              )
            );
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
      const obj = await s3
        .send(
          new GetObjectCommand({
            Bucket: bootstrap.bucket,
            Key:
              ["lock", input.config.app, input.config.stage].join("/") +
              ".json",
            VersionId: input.versionID,
          })
        )
        .catch(() => {});
      if (!obj) return;
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
      console.log(lock);
      await useTransaction(async (tx) => {
        const result = await tx
          .select({
            count: count(),
          })
          .from(stateUpdateTable)
          .where(
            and(
              eq(stateUpdateTable.workspaceID, useWorkspace()),
              eq(stateUpdateTable.stageID, input.config.stageID)
            )
          )
          .then((result) => result[0]?.count || 0);
        console.log(result);
        await tx.insert(stateUpdateTable).values({
          workspaceID: useWorkspace(),
          command: command.data,
          id: lock.updateID,
          index: result + 1,
          stageID: input.config.stageID,
          source: {
            type: "cli",
            properties: {},
          },
          timeStarted: new Date(lock.created),
        });

        await createTransactionEffect(() => Replicache.poke());
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
      const obj = await s3
        .send(
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
        )
        .catch(() => {});
      if (!obj) return;
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
            timeStarted: new Date(summary.timeStarted),
            timeCompleted: new Date(summary.timeCompleted),
          })
          .where(
            and(
              eq(stateUpdateTable.workspaceID, useWorkspace()),
              eq(stateUpdateTable.id, input.updateID)
            )
          );
        await createTransactionEffect(() => Replicache.poke());
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
      useTransaction(async (tx) => {
        const result = await tx
          .select({
            count: count(),
          })
          .from(stateUpdateTable)
          .where(
            and(
              eq(stateUpdateTable.workspaceID, useWorkspace()),
              eq(stateUpdateTable.stageID, input.stageID)
            )
          )
          .then((result) => result[0]?.count || 0);
        await createTransactionEffect(() => Replicache.poke());
        return tx.insert(stateUpdateTable).ignore().values({
          id: input.id,
          stageID: input.stageID,
          workspaceID: useWorkspace(),
          source: input.source,
          command: input.command,
        });
      })
  );
}
