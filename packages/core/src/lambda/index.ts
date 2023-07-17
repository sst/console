import { z } from "zod";
import { zod } from "../util/zod";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { Stage } from "../app";
import { useTransaction } from "../util/transaction";
import { lambdaPayload } from "./lambda.sql";
import { useActor, useWorkspace } from "../actor";
import { createSelectSchema } from "drizzle-zod";
import { createId } from "@paralleldrive/cuid2";

export * as Lambda from ".";

export const invoke = zod(
  z.object({
    stageID: z.string(),
    functionARN: z.string(),
    payload: z.any(),
  }),
  async (input) => {
    const config = await Stage.assumeRole(input.stageID);
    const client = new LambdaClient(config);
    await client.send(
      new InvokeCommand({
        FunctionName: input.functionARN,
        Payload: Buffer.from(JSON.stringify(input.payload)),
        InvocationType: "Event",
      })
    );
  }
);

export const SavedPayload = createSelectSchema(lambdaPayload, {
  id: (schema) => schema.id.cuid2(),
});

export const savePayload = zod(
  SavedPayload.pick({
    id: true,
    name: true,
    functionARN: true,
    payload: true,
  }).partial({
    id: true,
  }),
  async (input) =>
    useTransaction(async (tx) => {
      const id = input.id || createId();
      await tx.insert(lambdaPayload).values({
        id,
        functionARN: input.functionARN,
        name: input.name,
        creator: useActor(),
        workspaceID: useWorkspace(),
        payload: input.payload,
      });
    })
);
