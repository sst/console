import { z } from "zod";
import { zod } from "../util/zod";
import {
  stateUpdateTable,
  stateResourceTable,
  Source,
  Action,
  UpdateCommand,
  Command,
} from "./state.sql";
import { useTransaction } from "../util/transaction";
import { createId } from "@paralleldrive/cuid2";
import { DateTime } from "luxon";
import { useWorkspace } from "../actor";
import { and, eq, sql } from "drizzle-orm";
import { event } from "../event";
import { createSelectSchema } from "drizzle-zod";
import { StageCredentials } from "../app/stage";
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

  export const Update = z.object({
    id: z.string().cuid(),
    stageID: z.string().cuid(),
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
    id: z.string().cuid(),
    stageID: z.string().cuid(),
    updateID: z.string().cuid(),
    type: z.string(),
    urn: z.string(),
    action: z.enum(Action),
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

  export function serializeUpdate(
    input: typeof stateUpdateTable.$inferSelect
  ): Update {
    return {
      id: input.id,
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

  export function serializeResource(
    input: typeof stateResourceTable.$inferSelect
  ): Resource {
    return {
      id: input.id,
      type: input.type,
      action: input.action,
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
          );
        console.log("found previous", previousKey);
      }
      if (!previousState.resources) previousState.resources = [];

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
        resource.inputs = resource.inputs || {};
        resource.outputs = resource.outputs || {};
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
          timeStateModified: new Date(resource.modified),
          timeStateCreated: new Date(resource.created),
          workspaceID: useWorkspace(),
          type: resource.type,
          urn: resource.urn,
          custom: resource.boolean,
          inputs: resource.inputs,
          outputs: resource.outputs,
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
      if (inserts.length)
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
      console.log(lock);
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
          timeStarted: new Date(lock.created),
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
            timeStarted: new Date(summary.timeStarted),
            timeCompleted: new Date(summary.timeCompleted),
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
}
