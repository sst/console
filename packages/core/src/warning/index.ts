export * as Warning from "./index";
import { warning } from "./warning.sql";
import { useTransaction } from "../util/transaction";
import { useWorkspace } from "../actor";
import { createId } from "@paralleldrive/cuid2";

export type Info = typeof warning.$inferSelect & Data;

type Data = {
  type: "log_subscription";
  data:
    | {
        error: "limited" | "permissions";
      }
    | {
        error: "unknown";
        message: string;
      };
};

export async function create(
  input: Data & { target: Info["target"]; stageID: Info["stageID"] }
) {
  await useTransaction(async (tx) =>
    tx
      .insert(warning)
      .values({
        id: createId(),
        stageID: input.stageID,
        workspaceID: useWorkspace(),
        type: input.type,
        target: input.target,
        data: input.data,
      })
      .onDuplicateKeyUpdate({
        set: {
          data: input.data,
        },
      })
      .execute()
  );
}
