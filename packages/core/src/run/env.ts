import { z } from "zod";
import { minimatch } from "minimatch";
import { zod } from "../util/zod";
import { createTransactionEffect, useTransaction } from "../util/transaction";
import { Env, runConfigTable } from "./run.sql";
import { useWorkspace } from "../actor";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { event } from "../event";

export module RunConfig {
  export const Events = {
    Updated: event(
      "app.env.updated",
      z.object({
        appID: z.string().cuid2(),
        stagePattern: z.string().nonempty(),
        awsAccountExternalID: z.string(),
      }),
    ),
  };

  export const Info = z.object({
    id: z.string().cuid2(),
    appID: z.string().cuid2(),
    stagePattern: z.string().nonempty(),
    awsAccountExternalID: z.string().length(12),
    env: z.custom<Env>(),
    time: z.object({
      created: z.string(),
      deleted: z.string().optional(),
      updated: z.string(),
    }),
  });
  export type Info = z.infer<typeof Info>;

  export const getByStageName = zod(
    z.object({
      appID: z.string().cuid2(),
      stageName: z.string().nonempty(),
    }),
    async (input) => {
      // Get all stage patterns
      const stages = await useTransaction((tx) =>
        tx
          .select()
          .from(runConfigTable)
          .where(
            and(
              eq(runConfigTable.workspaceID, useWorkspace()),
              eq(runConfigTable.appID, input.appID),
            ),
          )
          .execute()
          .then((rows) => rows),
      );

      return stages.find((row) => minimatch(input.stageName, row.stagePattern));
    },
  );

  export const put = zod(
    z.object({
      id: z.string().cuid2().optional(),
      appID: z.string().cuid2(),
      stagePattern: z.string().nonempty(),
      awsAccountExternalID: z.string(),
      env: z.custom<Env>().optional(),
    }),
    async (input) => {
      await useTransaction(async (tx) =>
        tx
          .insert(runConfigTable)
          .values({
            id: input.id ?? createId(),
            workspaceID: useWorkspace(),
            appID: input.appID,
            stagePattern: input.stagePattern,
            awsAccountExternalID: input.awsAccountExternalID,
            env: input.env,
          })
          .onDuplicateKeyUpdate({
            set: {
              env: input.env,
              awsAccountExternalID: input.awsAccountExternalID,
              stagePattern: input.stagePattern,
            },
          })
          .execute(),
      );
      await createTransactionEffect(() =>
        Events.Updated.publish({
          appID: input.appID,
          stagePattern: input.stagePattern,
          awsAccountExternalID: input.awsAccountExternalID,
        }),
      );
    },
  );

  export const remove = zod(z.string().cuid2(), (input) =>
    useTransaction(async (tx) => {
      await tx
        .delete(runConfigTable)
        .where(
          and(
            eq(runConfigTable.id, input),
            eq(runConfigTable.workspaceID, useWorkspace()),
          ),
        )
        .execute();
    }),
  );
}
