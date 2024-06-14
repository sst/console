import { z } from "zod";
import { zod } from "../util/zod";
import { createTransactionEffect, useTransaction } from "../util/transaction";
import { appRepoTable } from "./app.sql";
import { useWorkspace } from "../actor";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, inArray } from "drizzle-orm";
import { event } from "../event";
import { Trigger } from "../run/run.sql";

export module AppRepo {
  export const Repo = z.object({
    id: z.string().cuid2(),
    appID: z.string().cuid2(),
    type: z.enum(["github"]),
    repoID: z.string().cuid2(),
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
  export type Repo = z.infer<typeof Repo>;

  export const Events = {
    Connected: event(
      "app.repo.connected",
      z.object({
        appID: Repo.shape.appID,
        repoID: Repo.shape.repoID,
      })
    ),
  };

  export function serializeAppRepo(
    input: typeof appRepoTable.$inferSelect
  ): Repo {
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

  export const getByID = zod(Repo.shape.id, (id) =>
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

  export const getByAppID = zod(Repo.shape.appID, (appID) =>
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
    Repo.pick({ id: true, appID: true, type: true, repoID: true }).partial({
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

  export const disconnect = zod(Repo.shape.id, (input) =>
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

  export const multiSetLastEvent = zod(
    z.object({
      workspaceIDs: z.array(z.string().cuid2()),
      appRepoIDs: z.array(Repo.shape.id),
      gitContext: Trigger,
    }),
    async ({ workspaceIDs, appRepoIDs, gitContext }) => {
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
          .where(
            and(
              inArray(appRepoTable.workspaceID, workspaceIDs),
              inArray(appRepoTable.id, appRepoIDs)
            )
          )
      );
      return lastEventID;
    }
  );

  export const setLastEventStatus = zod(
    z.object({
      appRepoID: Repo.shape.id,
      lastEventID: z.string().cuid2(),
      status: z.string().nonempty(),
    }),
    async ({ appRepoID, lastEventID, status }) => {
      await useTransaction((tx) =>
        tx
          .update(appRepoTable)
          .set({ lastEventStatus: status })
          .where(
            and(
              eq(appRepoTable.workspaceID, useWorkspace()),
              eq(appRepoTable.id, appRepoID),
              eq(appRepoTable.lastEventID, lastEventID)
            )
          )
      );
    }
  );

  export const multiSetLastEventStatus = zod(
    z.object({
      workspaceIDs: z.array(z.string().cuid2()),
      appRepoIDs: z.array(Repo.shape.id),
      lastEventID: z.string().cuid2(),
      status: z.string().nonempty(),
    }),
    async ({ workspaceIDs, appRepoIDs, lastEventID, status }) => {
      await useTransaction((tx) =>
        tx
          .update(appRepoTable)
          .set({ lastEventStatus: status })
          .where(
            and(
              inArray(appRepoTable.workspaceID, workspaceIDs),
              inArray(appRepoTable.id, appRepoIDs),
              eq(appRepoTable.lastEventID, lastEventID)
            )
          )
      );
    }
  );
}
