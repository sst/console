import { z } from "zod";
import { zod } from "../util/zod";
import { createTransactionEffect, useTransaction } from "../util/transaction";
import { appRepoTable } from "./app.sql";
import { useWorkspace } from "../actor";
import { createId } from "@paralleldrive/cuid2";
import { createSelectSchema } from "drizzle-zod";
import { and, eq, sql } from "drizzle-orm";
import { event } from "../event";
import { Trigger } from "../run/run.sql";

export module AppRepo {
  export const Events = {
    Connected: event(
      "app.repo.connected",
      z.object({
        appID: z.string(),
        repoID: z.number().int(),
      })
    ),
  };

  export const AppRepo = z.object({
    id: z.string().cuid2(),
    appID: z.string().cuid2(),
    type: z.enum(["github"]),
    repoID: z.number().int(),
    time: z.object({
      created: z.string(),
      deleted: z.string().optional(),
      updated: z.string(),
      lastEvent: z.string().optional(),
    }),
    lastEvent: Trigger.optional(),
    lastEventID: z.string().cuid2().optional(),
    lastEventStatus: z.string().nonempty().optional(),
  });
  export type AppRepo = z.infer<typeof AppRepo>;

  export function serializeAppRepo(
    input: typeof appRepoTable.$inferSelect
  ): AppRepo {
    return {
      id: input.id,
      appID: input.appID,
      type: input.type,
      repoID: input.repoID,
      time: {
        created: input.timeCreated.toISOString(),
        updated: input.timeUpdated.toISOString(),
        deleted: input.timeDeleted?.toISOString(),
        lastEvent: input.timeLastEvent?.toISOString(),
      },
      lastEvent: input.lastEvent || undefined,
      lastEventID: input.lastEventID || undefined,
      lastEventStatus: input.lastEventStatus || undefined,
    };
  }

  export const listByRepo = zod(
    AppRepo.pick({
      type: true,
      repoID: true,
    }),
    (input) =>
      useTransaction((tx) =>
        tx
          .select()
          .from(appRepoTable)
          .where(
            and(
              eq(appRepoTable.type, "github"),
              eq(appRepoTable.repoID, input.repoID)
            )
          )
          .execute()
      )
  );

  export const getByID = zod(AppRepo.shape.id, (id) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(appRepoTable)
        .where(
          and(
            eq(appRepoTable.workspaceID, useWorkspace()),
            eq(appRepoTable.id, id)
          )
        )
        .execute()
        .then((rows) => rows[0])
    )
  );

  export const getByAppID = zod(AppRepo.shape.appID, (appID) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(appRepoTable)
        .where(
          and(
            eq(appRepoTable.workspaceID, useWorkspace()),
            eq(appRepoTable.appID, appID)
          )
        )
        .execute()
        .then((rows) => rows[0])
    )
  );

  export const connect = zod(
    AppRepo.pick({ id: true, appID: true, type: true, repoID: true }).partial({
      id: true,
    }),
    async (input) => {
      await useTransaction(async (tx) =>
        tx
          .insert(appRepoTable)
          .values({
            id: input.id ?? createId(),
            workspaceID: useWorkspace(),
            appID: input.appID,
            type: input.type,
            repoID: input.repoID,
          })
          .onDuplicateKeyUpdate({
            set: {
              type: input.type,
              repoID: input.repoID,
            },
          })
          .execute()
      );
      await createTransactionEffect(() =>
        Events.Connected.publish({ appID: input.appID, repoID: input.repoID })
      );
    }
  );

  export const disconnect = zod(AppRepo.shape.id, (input) =>
    useTransaction((tx) => {
      return tx
        .delete(appRepoTable)
        .where(
          and(
            eq(appRepoTable.id, input),
            eq(appRepoTable.workspaceID, useWorkspace())
          )
        )
        .execute();
    })
  );

  export const setLastEvent = zod(
    z.object({
      repoID: z.number().int(),
      gitContext: Trigger,
    }),
    async ({ repoID, gitContext }) => {
      const lastEventID = createId();
      await useTransaction((tx) =>
        tx
          .update(appRepoTable)
          .set({
            lastEvent: gitContext,
            lastEventID,
            lastEventStatus: null,
            timeLastEvent: new Date(),
          })
          .where(eq(appRepoTable.repoID, repoID))
      );
      return lastEventID;
    }
  );

  export const setLastEventStatus = zod(
    z.object({
      appID: z.string().cuid2().optional(),
      repoID: z.number().int(),
      lastEventID: z.string().cuid2(),
      status: z.string().nonempty(),
    }),
    async ({ appID, repoID, lastEventID, status }) => {
      await useTransaction((tx) =>
        tx
          .update(appRepoTable)
          .set({ lastEventStatus: status })
          .where(
            appID
              ? and(
                  eq(appRepoTable.workspaceID, useWorkspace()),
                  eq(appRepoTable.repoID, repoID),
                  eq(appRepoTable.appID, appID),
                  eq(appRepoTable.lastEventID, lastEventID)
                )
              : and(
                  eq(appRepoTable.repoID, repoID),
                  eq(appRepoTable.lastEventID, lastEventID)
                )
          )
      );
    }
  );
}
