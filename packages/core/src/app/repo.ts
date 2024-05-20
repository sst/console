import { z } from "zod";
import { zod } from "../util/zod";
import { useTransaction } from "../util/transaction";
import { appRepo } from "./app.sql";
import { useWorkspace } from "../actor";
import { createId } from "@paralleldrive/cuid2";
import { createSelectSchema } from "drizzle-zod";
import { and, eq } from "drizzle-orm";

export * as AppRepo from "./repo";

export const RepoSource = z.object({
  type: z.literal("github"),
  repoID: z.number().int(),
});
export type RepoSource = z.infer<typeof RepoSource>;

export const Info = createSelectSchema(appRepo).extend({
  source: RepoSource,
});
export type Info = z.infer<typeof Info>;

export const connect = zod(
  Info.pick({ id: true, appID: true, source: true }).partial({
    id: true,
  }),
  (input) =>
    useTransaction(async (tx) =>
      tx
        .insert(appRepo)
        .values({
          id: input.id ?? createId(),
          workspaceID: useWorkspace(),
          appID: input.appID,
          source: input.source,
        })
        .onDuplicateKeyUpdate({
          set: {
            source: input.source,
          },
        })
        .execute()
    )
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
