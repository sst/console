import { z } from "zod";
import { zod } from "../util/zod";
import { Block, KnownBlock, WebClient } from "@slack/web-api";
import { useTransaction } from "../util/transaction";
import { slackTeam } from "./slack.sql";
import { useWorkspace } from "../actor";
import { createId } from "@paralleldrive/cuid2";
import { and, db, eq } from "../drizzle";
import { createSelectSchema } from "drizzle-zod";

export * as Slack from "./index";

export const Info = createSelectSchema(slackTeam);
export type Info = z.infer<typeof Info>;

export const connect = zod(z.string().nonempty(), async (token) => {
  const client = new WebClient(token);
  const response = await client.team.info();
  await useTransaction(async (tx) =>
    tx
      .insert(slackTeam)
      .values({
        workspaceID: useWorkspace(),
        accessToken: token,
        id: createId(),
        teamID: response.team?.id!,
        teamName: response.team?.name!,
      })
      .onDuplicateKeyUpdate({
        set: {
          accessToken: token,
          teamName: response.team?.name!,
        },
      })
      .execute()
  );
});

export const disconnect = zod(Info.shape.id, (input) =>
  useTransaction((tx) => {
    return tx
      .delete(slackTeam)
      .where(
        and(eq(slackTeam.id, input), eq(slackTeam.workspaceID, useWorkspace()))
      )
      .execute();
  })
);

export const send = zod(
  z.object({
    channel: z.string().nonempty(),
    blocks: z.custom<KnownBlock[]>(),
    teamName: z.string().nonempty(),
  }),
  async (input) => {
    const result = await db
      .select()
      .from(slackTeam)
      .where(
        and(
          eq(slackTeam.teamID, input.teamName),
          eq(slackTeam.workspaceID, useWorkspace())
        )
      )
      .then((rows) => rows.at(0));

    if (!result) return;

    const client = new WebClient(result.accessToken);
    await client.chat.postMessage({
      attachments: [
        {
          color: "#ff0000",
          blocks: input.blocks,
        },
      ],
      channel: input.channel,
    });
  }
);
