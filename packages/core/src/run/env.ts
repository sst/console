import { z } from "zod";
import { minimatch } from "minimatch";
import { zod } from "../util/zod";
import { createTransactionEffect, useTransaction } from "../util/transaction";
import { runEnvTable } from "./run.sql";
import { useWorkspace } from "../actor";
import { createId } from "@paralleldrive/cuid2";
import { createSelectSchema } from "drizzle-zod";
import { and, eq } from "drizzle-orm";
import { event } from "../event";

export * as RunEnv from "./env";

export const Events = {
  Updated: event(
    "app.env.updated",
    z.object({
      appID: z.string().cuid2(),
      stageName: z.string().nonempty(),
      key: z.string().nonempty(),
      value: z.string().nonempty(),
    })
  ),
};

export const Info = createSelectSchema(runEnvTable);
export type Info = z.infer<typeof Info>;

export const listByStage = zod(
  Info.pick({
    appID: true,
    stageName: true,
  }),
  async (input) => {
    // Get all stage patterns
    const stages = await useTransaction((tx) =>
      tx
        .selectDistinct({
          stageName: runEnvTable.stageName,
        })
        .from(runEnvTable)
        .where(
          and(
            eq(runEnvTable.workspaceID, useWorkspace()),
            eq(runEnvTable.appID, input.appID)
          )
        )
        .execute()
        .then((rows) => rows)
    );

    // Find matching stage pattern
    const found = stages.find((row) =>
      minimatch(input.stageName, row.stageName)
    );
    if (!found) return {};

    // Get all envs
    const ret = await useTransaction((tx) =>
      tx
        .select()
        .from(runEnvTable)
        .where(
          and(
            eq(runEnvTable.workspaceID, useWorkspace()),
            eq(runEnvTable.appID, input.appID),
            eq(runEnvTable.stageName, found.stageName)
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
  async (input) => {
    await useTransaction(async (tx) =>
      tx
        .insert(runEnvTable)
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
    );
    await createTransactionEffect(() =>
      Events.Updated.publish({
        appID: input.appID,
        stageName: input.stageName,
        key: input.key,
        value: input.value,
      })
    );
  }
);

export const remove = zod(Info.shape.id, (input) =>
  useTransaction(async (tx) => {
    await tx
      .delete(runEnvTable)
      .where(
        and(
          eq(runEnvTable.id, input),
          eq(runEnvTable.workspaceID, useWorkspace())
        )
      )
      .execute();
  })
);
