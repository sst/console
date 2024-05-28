import { z } from "zod";
import { zod } from "../util/zod";
import { App } from "octokit";
import { createTransaction, useTransaction } from "../util/transaction";
import { githubOrg, githubRepo } from "./git.sql";
import { useWorkspace } from "../actor";
import { createId } from "@paralleldrive/cuid2";
import { and, db, eq, notInArray, or, sql } from "../drizzle";
import { createSelectSchema } from "drizzle-zod";
import { Config } from "sst/node/config";
import { event } from "../event";

export * as Github from "./github";

export const Events = {
  Installed: event(
    "github.installed",
    z.object({
      installationID: z.number().int(),
    })
  ),
};

export const OrgInfo = createSelectSchema(githubOrg);
export type OrgInfo = z.infer<typeof OrgInfo>;
export const RepoInfo = createSelectSchema(githubRepo);
export type RepoInfo = z.infer<typeof RepoInfo>;

export const connect = zod(z.number(), async (installationID) => {
  // Get installation detail
  const app = new App({
    appId: Config.GITHUB_APP_ID,
    privateKey: Config.GITHUB_PRIVATE_KEY,
  });
  const octokit = await app.getInstallationOctokit(installationID);
  const installation = await octokit.rest.apps.getInstallation({
    installation_id: installationID,
  });
  const orgID = installation.data.account?.id!;
  // @ts-ignore
  const login = installation.data.account?.login;

  await useTransaction(async (tx) =>
    tx
      .insert(githubOrg)
      .values({
        workspaceID: useWorkspace(),
        id: createId(),
        orgID,
        login,
        installationID,
      })
      .onDuplicateKeyUpdate({
        set: {
          login,
          installationID,
        },
      })
      .execute()
  );
  await Events.Installed.publish({ installationID });
});

export const disconnect = zod(OrgInfo.shape.id, (id) =>
  useTransaction((tx) => {
    return tx
      .delete(githubOrg)
      .where(
        and(eq(githubOrg.id, id), eq(githubOrg.workspaceID, useWorkspace()))
      )
      .execute();
  })
);

export const disconnectAll = zod(z.number().int(), (input) =>
  useTransaction((tx) => {
    return tx
      .delete(githubOrg)
      .where(eq(githubOrg.installationID, input))
      .execute();
  })
);

export const syncRepos = zod(
  z.object({
    installationID: z.number().int(),
  }),
  async (input) => {
    // get workspaces with this installation
    const orgs = await useTransaction((tx) =>
      tx
        .select()
        .from(githubOrg)
        .where(eq(githubOrg.installationID, input.installationID))
        .execute()
    );
    if (orgs.length === 0) return;

    // fetch repos from GitHub
    const app = new App({
      appId: Config.GITHUB_APP_ID,
      privateKey: Config.GITHUB_PRIVATE_KEY,
    });
    const octokit = await app.getInstallationOctokit(input.installationID);
    const repos: { id: number; name: string }[] = [];
    for (let page = 1; ; page++) {
      const ret = await octokit.rest.apps.listReposAccessibleToInstallation({
        per_page: 100,
        page,
      });
      repos.push(
        ...ret.data.repositories.map((repo) => ({
          id: repo.id,
          name: repo.name,
        }))
      );
      if (ret.data.repositories.length < 100) break;
    }

    // store repos for each workspace
    await createTransaction(async (tx) => {
      await tx
        .delete(githubRepo)
        .where(
          or(
            ...orgs.map((org) =>
              and(
                eq(githubRepo.workspaceID, org.workspaceID),
                eq(githubRepo.orgID, org.orgID),
                notInArray(
                  githubRepo.repoID,
                  repos.map(({ id }) => id)
                )
              )
            )
          )
        )
        .execute();

      await tx
        .insert(githubRepo)
        .values(
          orgs.flatMap((org) =>
            repos.map((repo) => ({
              id: createId(),
              workspaceID: org.workspaceID,
              orgID: org.orgID,
              repoID: repo.id,
              name: repo.name,
            }))
          )
        )
        .onDuplicateKeyUpdate({
          set: {
            name: sql`VALUES(name)`,
          },
        })
        .execute();
    });
  }
);
