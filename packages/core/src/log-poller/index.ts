export * as LogPoller from "./index";

import { createSelectSchema } from "drizzle-zod";
import { log_poller } from "./log-poller.sql";
import { zod } from "../util/zod";
import { createTransactionEffect, useTransaction } from "../util/transaction";
import cuid2 from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { useWorkspace } from "../actor";

export const Info = createSelectSchema(log_poller, {
  id: (schema) => schema.id.cuid2(),
});

const sfn = new SFNClient({});
export const subscribe = zod(
  Info.pick({
    stageID: true,
    logGroup: true,
  }),
  async (input) =>
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
              input: JSON.stringify({
                ...input,
                workspaceID: useWorkspace(),
                pollerID: existing,
              }),
            })
          );
        });
      }
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

export const clear = zod(Info.shape.id, async (id) =>
  useTransaction((tx) =>
    tx
      .delete(log_poller)
      .where(
        and(eq(log_poller.id, id), eq(log_poller.workspaceID, useWorkspace()))
      )
  )
);
