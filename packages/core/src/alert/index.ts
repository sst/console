import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { useWorkspace } from "../actor";
import { createSelectSchema } from "drizzle-zod";
import { zod } from "../util/zod";
import { useTransaction } from "../util/transaction";
import { z } from "zod";
import { warning } from "../warning/warning.sql";
import { alert } from "./alert.sql";

export module Alert {
  export const Info = createSelectSchema(alert, {
    source: () => z.custom<Source>(),
    destination: () => z.custom<Destination>(),
  });
  export type Info = z.infer<typeof Info>;

  export interface Source {
    app: "*" | string[];
    stage: "*" | string[];
  }

  export type Destination = SlackDestination | EmailDestination;

  export interface SlackDestination {
    type: "slack";
    properties: {
      channel: string;
    };
  }

  export interface EmailDestination {
    type: "email";
    properties: {
      users: "*" | string[];
    };
  }

  export const list = zod(z.void(), (input) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(alert)
        .where(eq(alert.workspaceID, useWorkspace()))
        .execute()
        .then((rows) => rows as Info[])
    )
  );

  export const put = zod(
    Info.pick({ id: true, source: true, destination: true }).partial({
      id: true,
    }),
    (input) =>
      useTransaction(async (tx) => {
        const id = input.id ?? createId();
        await tx
          .insert(alert)
          .values({
            id,
            workspaceID: useWorkspace(),
            source: input.source,
            destination: input.destination,
          })
          .onDuplicateKeyUpdate({
            set: {
              source: input.source,
              destination: input.destination,
            },
          });
        await tx
          .delete(warning)
          .where(
            and(
              eq(warning.workspaceID, useWorkspace()),
              eq(warning.type, "issue_alert_slack"),
              eq(warning.target, id)
            )
          );
        return id;
      })
  );

  export const create = zod(
    Info.pick({ id: true }).partial({ id: true }),
    (input) =>
      useTransaction(async (tx) => {
        const id = input.id ?? createId();
        await tx.insert(alert).values({
          id,
          workspaceID: useWorkspace(),
          source: {
            stage: "*",
            app: "*",
          },
          destination: {
            type: "email",
            properties: {
              users: "*",
            },
          },
        });
        return id;
      })
  );

  export const remove = zod(Info.shape.id, (input) =>
    useTransaction((tx) =>
      tx
        .delete(alert)
        .where(and(eq(alert.id, input), eq(alert.workspaceID, useWorkspace())))
    )
  );
}
