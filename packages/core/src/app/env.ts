import { z } from "zod";
import { zod } from "../util/zod";
import { useTransaction } from "../util/transaction";
import { env } from "./app.sql";
import { useWorkspace } from "../actor";
import { createId } from "@paralleldrive/cuid2";
import { createSelectSchema } from "drizzle-zod";
import { and, eq } from "drizzle-orm";

export * as Env from "./env";

export const Info = createSelectSchema(env);
export type Info = z.infer<typeof Info>;

export const list = zod(Info.pick({ appID: true, stageID: true }), (input) =>
  useTransaction((tx) =>
    tx
      .select()
      .from(env)
      .where(
        and(eq(env.workspaceID, useWorkspace()), eq(env.appID, input.appID))
      )
      .execute()
  )
);

export const create = zod(
  Info.pick({
    id: true,
    appID: true,
    stageName: true,
    key: true,
    value: true,
  }).partial({
    id: true,
  }),
  (input) =>
    useTransaction(async (tx) =>
      tx
        .insert(env)
        .values({
          id: input.id ?? createId(),
          workspaceID: useWorkspace(),
          appID: input.appID,
          stageName: input.stageName,
          key: input.key,
          value: input.value,
        })
        .onDuplicateKeyUpdate({
          set: {
            value: input.value,
          },
        })
        .execute()
    )
);

export const remove = zod(Info.shape.id, (input) =>
  useTransaction(async (tx) => {
    await tx
      .delete(env)
      .where(and(eq(env.id, input), eq(env.workspaceID, useWorkspace())))
      .execute();
  })
);
