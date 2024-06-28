import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { useWorkspace } from "../actor";
import { zod } from "../util/zod";
import { useTransaction } from "../util/transaction";
import { z } from "zod";
import { warning } from "../warning/warning.sql";
import { Event, alert } from "./alert.sql";

export module Alert {
  export const Info = z.object({
    id: z.string().cuid2(),
    source: z.custom<Source>(),
    destination: z.custom<Destination>(),
    event: z.enum(Event).default("issue"),
    time: z.object({
      created: z.string(),
      deleted: z.string().optional(),
      updated: z.string(),
    }),
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

  export function serialize(input: typeof alert.$inferSelect): Info {
    return {
      id: input.id,
      time: {
        created: input.timeCreated.toISOString(),
        updated: input.timeUpdated.toISOString(),
        deleted: input.timeDeleted?.toISOString(),
      },
      source: input.source,
      destination: input.destination,
      event: input.event ?? "issue",
    };
  }

  export const list = zod(
    z.object({
      app: z.string(),
      stage: z.string(),
      event: z.enum(Event),
    }),
    async ({ app, stage, event }) => {
      const alerts = await useTransaction((tx) =>
        tx
          .select()
          .from(alert)
          .where(eq(alert.workspaceID, useWorkspace()))
          .execute()
      );
      return alerts.filter(
        (alert) =>
          (alert.source.app === "*" || alert.source.app.includes(app)) &&
          (alert.source.stage === "*" || alert.source.stage.includes(stage)) &&
          (alert.event ?? "issue") === event
      );
    }
  );

  export const put = zod(
    z.object({
      id: Info.shape.id.optional(),
      source: Info.shape.source,
      destination: Info.shape.destination,
      event: Info.shape.event,
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
            event: input.event,
          })
          .onDuplicateKeyUpdate({
            set: {
              source: input.source,
              destination: input.destination,
              event: input.event,
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

  export const remove = zod(Info.shape.id, (input) =>
    useTransaction((tx) =>
      tx
        .delete(alert)
        .where(and(eq(alert.id, input), eq(alert.workspaceID, useWorkspace())))
    )
  );
}
