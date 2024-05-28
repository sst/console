import { z } from "zod";
import { zod } from "../util/zod";
import { useTransaction } from "../util/transaction";
import { env } from "./app.sql";
import { useWorkspace } from "../actor";
import { createId } from "@paralleldrive/cuid2";
import { createSelectSchema } from "drizzle-zod";
import { and, eq, inArray } from "drizzle-orm";

export * as Env from "./env";

export const Info = createSelectSchema(env);
export type Info = z.infer<typeof Info>;

export const listByStage = zod(
  Info.pick({
    appID: true,
    stageName: true,
  }),
  async (input) => {
    const ret = await useTransaction((tx) =>
      tx
        .select()
        .from(env)
        .where(
          and(
            eq(env.workspaceID, useWorkspace()),
            eq(env.appID, input.appID),
            inArray(env.stageName, ["", input.stageName])
          )
        )
        .execute()
        .then((rows) => rows)
    );
    const envs: Record<string, string> = {};
    for (const row of ret) {
      if (row.stageName === "" && row.key in envs) continue;
      envs[row.key] = row.value;
    }
    return envs;
  }
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
