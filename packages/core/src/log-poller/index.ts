export * as LogPoller from "./index";

import { createSelectSchema } from "drizzle-zod";
import { log_poller } from "./log-poller.sql";
import { zod } from "../util/zod";
import { createTransactionEffect, useTransaction } from "../util/transaction";
import cuid2 from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { useWorkspace } from "../actor";
import { z } from "zod";

export const Info = createSelectSchema(log_poller, {
  id: (schema) => schema.id.cuid2(),
});
export type Info = z.infer<typeof Info>;

const sfn = new SFNClient({});
export const subscribe = zod(
  Info.pick({
    stageID: true,
    logGroup: true,
  }),
  (input) =>
    useTransaction(async (tx) => {
      let existing = await tx
        .select({
          id: log_poller.id,
        })
        .from(log_poller)
        .where(
          and(
            eq(log_poller.stageID, input.stageID),
            eq(log_poller.logGroup, input.logGroup),
            eq(log_poller.workspaceID, useWorkspace())
          )
        )
        .execute()
        .then((rows) => rows[0]?.id);
      if (!existing) {
        console.log("log poller", "starting new execution");
        existing = cuid2.createId();
        await tx
          .insert(log_poller)
          .values({
            id: existing,
            logGroup: input.logGroup,
            workspaceID: useWorkspace(),
            stageID: input.stageID,
          })
          .execute();
        createTransactionEffect(async () => {
          await sfn.send(
            new StartExecutionCommand({
              stateMachineArn: process.env.LOG_POLLER_ARN,
              name: input.logGroup,
              input: JSON.stringify({
                ...input,
                workspaceID: useWorkspace(),
                pollerID: existing,
              }),
            })
          );
        });
        return true;
      }
      return false;
    })
);

export const fromID = zod(Info.shape.id, async (id) =>
  useTransaction((tx) =>
    tx
      .select()
      .from(log_poller)
      .where(
        and(eq(log_poller.id, id), eq(log_poller.workspaceID, useWorkspace()))
      )
      .then((rows) => rows[0])
  )
);

export const remove = zod(Info.shape.id, async (id) =>
  useTransaction((tx) =>
    tx
      .delete(log_poller)
      .where(
        and(eq(log_poller.id, id), eq(log_poller.workspaceID, useWorkspace()))
      )
  )
);

export const setExecution = zod(
  Info.pick({
    id: true,
    executionARN: true,
  }),
  async (input) =>
    useTransaction((tx) =>
      tx
        .update(log_poller)
        .set({
          executionARN: input.executionARN,
        })
        .where(
          and(
            eq(log_poller.id, input.id),
            eq(log_poller.workspaceID, useWorkspace())
          )
        )
    )
);

export const clear = zod(Info.shape.id, async (id) =>
  useTransaction((tx) =>
    tx
      .delete(log_poller)
      .where(
        and(eq(log_poller.id, id), eq(log_poller.workspaceID, useWorkspace()))
      )
  )
);
