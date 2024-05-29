import { z } from "zod";
import { zod } from "../util/zod";
import { useTransaction } from "../util/transaction";
import { appRepo } from "./app.sql";
import { useWorkspace } from "../actor";
import { createId } from "@paralleldrive/cuid2";
import { createSelectSchema } from "drizzle-zod";
import { and, eq } from "drizzle-orm";
import { event } from "../event";

export * as AppRepo from "./repo";

export const Events = {
  Connected: event(
    "app.repo.connected",
    z.object({
      appID: z.string(),
    })
  ),
};

export const Info = createSelectSchema(appRepo);
export type Info = z.infer<typeof Info>;

export const listByRepo = zod(
  Info.pick({
    type: true,
    repoID: true,
  }),
  (input) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(appRepo)
        .where(
          and(eq(appRepo.type, "github"), eq(appRepo.repoID, input.repoID))
        )
        .execute()
    )
);

export const connect = zod(
  Info.pick({ id: true, appID: true, type: true, repoID: true }).partial({
    id: true,
  }),
  async (input) => {
    await useTransaction(async (tx) =>
      tx
        .insert(appRepo)
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
    await Events.Connected.publish({ appID: input.appID });
  }
);

export const disconnect = zod(Info.shape.id, (input) =>
  useTransaction((tx) => {
    return tx
      .delete(appRepo)
      .where(
        and(eq(appRepo.id, input), eq(appRepo.workspaceID, useWorkspace()))
      )
      .execute();
  })
);
