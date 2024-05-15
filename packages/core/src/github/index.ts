import { z } from "zod";
import { zod } from "../util/zod";
import { App } from "octokit";
import { useTransaction } from "../util/transaction";
import { githubOrg } from "./github.sql";
import { useWorkspace } from "../actor";
import { createId } from "@paralleldrive/cuid2";
import { and, db, eq } from "../drizzle";
import { createSelectSchema } from "drizzle-zod";
import { Config } from "sst/node/config";

export * as Github from "./index";

export const Info = createSelectSchema(githubOrg);
export type Info = z.infer<typeof Info>;

const app = new App({
  appId: Config.GITHUB_APP_ID,
  privateKey: Config.GITHUB_PRIVATE_KEY,
});

export const connect = zod(z.number(), async (installationID) => {
  // Get installation detail
  const octokit = await app.getInstallationOctokit(installationID);
  const installation = await octokit.rest.apps.getInstallation({
    installation_id: installationID,
  });
  const orgID = installation.data.account?.id!;
  const orgSlug =
    "slug" in installation.data.account!
      ? installation.data.account!.slug
      : installation.data.account!.login;

  await useTransaction(async (tx) =>
    tx
      .insert(githubOrg)
      .values({
        workspaceID: useWorkspace(),
        id: createId(),
        orgID,
        orgSlug,
        installationID,
      })
      .onDuplicateKeyUpdate({
        set: {
          installationID,
          orgSlug,
        },
      })
      .execute()
  );
});

export const disconnect = zod(Info.shape.id, (input) =>
  useTransaction((tx) => {
    return tx
      .delete(githubOrg)
      .where(
        and(eq(githubOrg.id, input), eq(githubOrg.workspaceID, useWorkspace()))
      )
      .execute();
  })
);

export const disconnectAll = zod(z.number().int(), (input) =>
  useTransaction((tx) => {
    return tx.delete(githubOrg).where(eq(githubOrg.orgID, input)).execute();
  })
);

// TODO remove
//export const send = zod(
//  z.object({
//    channel: z.string().nonempty(),
//    text: z.string().nonempty(),
//    blocks: z.custom<KnownBlock[]>(),
//  }),
//  async (input) => {
//    const result = await db
//      .select()
//      .from(githubOrg)
//      .where(and(eq(githubOrg.workspaceID, useWorkspace())))
//      .limit(1)
//      .then((rows) => rows.at(0));
//
//    if (!result) return;
//
//    const client = new WebClient(result.accessToken);
//    await client.chat.postMessage({
//      blocks: input.blocks,
//      unfurl_links: false,
//      text: input.text,
//      channel: input.channel,
//    });
//  }
//);
