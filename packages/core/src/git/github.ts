import { z } from "zod";
import { zod } from "../util/zod";
import { App } from "octokit";
import { createTransaction, useTransaction } from "../util/transaction";
import { githubOrg, githubRepo } from "./git.sql";
import { useWorkspace } from "../actor";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, notInArray, or, inArray, sql } from "../drizzle";
import { createSelectSchema } from "drizzle-zod";
import { Config } from "sst/node/config";
import { event } from "../event";
import { useCallback } from "react";

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

let client: {
  octokit: Awaited<ReturnType<typeof createClient>>;
  installationID: number;
};
async function useClient(installationID: number) {
  if (client?.installationID !== installationID) {
    client = {
      octokit: await createClient(installationID),
      installationID,
    };
  }
  return client.octokit;
}
function createClient(installationID: number) {
  const app = new App({
    appId: Config.GITHUB_APP_ID,
    privateKey: Config.GITHUB_PRIVATE_KEY,
  });
  return app.getInstallationOctokit(installationID);
}

export const connect = zod(z.number(), async (installationID) => {
  // Get installation detail
  const client = await useClient(installationID);
  const installation = await client.rest.apps.getInstallation({
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

export const getByRepoID = zod(z.number(), (repoID) =>
  useTransaction(async (tx) =>
    tx
      .select({
        installationID: githubOrg.installationID,
        owner: githubOrg.login,
        repo: githubRepo.name,
      })
      .from(githubRepo)
      .innerJoin(githubOrg, eq(githubRepo.orgID, githubOrg.orgID))
      .where(
        and(
          eq(githubRepo.repoID, repoID),
          eq(githubRepo.workspaceID, useWorkspace())
        )
      )
      .execute()
      .then((x) => x[0])
  )
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
    const client = await useClient(input.installationID);
    const repos: { id: number; name: string }[] = [];
    for (let page = 1; ; page++) {
      const ret = await client.rest.apps.listReposAccessibleToInstallation({
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

export const getFile = zod(
  z.object({
    installationID: z.number().int(),
    owner: z.string().nonempty(),
    repo: z.string().nonempty(),
    ref: z.string().nonempty().optional(),
  }),
  async (input) => {
    const client = await useClient(input.installationID);
    const file = await client.rest.repos.getContent({
      owner: input.owner,
      repo: input.repo,
      ref: input.ref,
      path: "sst.config.ts",
    });
    if (!("content" in file.data)) {
      throw new Error("sst.config.ts not found");
    }
    return file.data.content;
  }
);

export const getCloneUrl = zod(
  z.object({
    installationID: z.number().int(),
    owner: z.string().nonempty(),
    repo: z.string().nonempty(),
  }),
  async (input) => {
    const client = await useClient(input.installationID);
    const oauthToken = await client
      .auth({ type: "installation" })
      .then((x: any) => x.token);
    return `https://oauth2:${oauthToken}@github.com/${input.owner}/${input.repo}.git`;
  }
);
