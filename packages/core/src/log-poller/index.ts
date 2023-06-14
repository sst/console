import { createSelectSchema } from "drizzle-zod";
import { log_poller } from "./log-poller.sql";
import { zod } from "../util/zod";
import { useTransaction } from "../util/transaction";
import cuid2 from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";

export const Info = createSelectSchema(log_poller, {
  id: (schema) => schema.id.cuid2(),
});

export const subscribe = zod(Info.shape.logGroup, async (logGroup) =>
  useTransaction(async (tx) => {
    const result = await tx
      .insert(log_poller)
      .values({
        logGroup,
        id: cuid2.createId(),
      })
      .onDuplicateKeyUpdate({
        set: {},
      })
      .execute();
    console.log("subscribe result", result);
    const id = await tx
      .select({
        id: log_poller.id,
      })
      .from(log_poller)
      .where(eq(log_poller.logGroup, logGroup))
      .execute()
      .then((rows) => rows[0]!.id);
  })
);
