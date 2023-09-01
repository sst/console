import { createSelectSchema } from "drizzle-zod";
import { usage } from "./billing.sql";
import { z } from "zod";
import { zod } from "../util/zod";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../drizzle";
import { eq, and, lte, gte, between } from "drizzle-orm";
import { useTransaction } from "../util/transaction";
import { useWorkspace } from "../actor";

export * as Billing from "./index";

export const Usage = createSelectSchema(usage, {
  id: (schema) => schema.id.cuid2(),
  workspaceID: (schema) => schema.workspaceID.cuid2(),
  stageID: (schema) => schema.stageID.cuid2(),
});
export type Usage = z.infer<typeof Usage>;

export const createUsage = zod(
  Usage.pick({ stageID: true, day: true, invocations: true }),
  async (input) => {
    return useTransaction(async (tx) => {
      await tx
        .insert(usage)
        .values({
          id: createId(),
          workspaceID: useWorkspace(),
          stageID: input.stageID,
          day: input.day,
          invocations: input.invocations,
        })
        .onDuplicateKeyUpdate({
          set: {
            invocations: input.invocations,
          },
        })
        .execute();
    });
  }
);

export const listByStartAndEndDay = zod(
  z.object({
    startDay: Usage.shape.day,
    endDay: Usage.shape.day,
  }),
  async (input) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(usage)
        .where(
          and(
            eq(usage.workspaceID, useWorkspace()),
            between(usage.day, input.startDay, input.endDay)
          )
        )
        .execute()
        .then((rows) => rows)
    )
);
