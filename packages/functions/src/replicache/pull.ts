import { useActor, useWorkspace } from "@console/core/actor";
import { Replicache } from "@console/core/replicache";
import { user } from "@console/core/user/user.sql";
import { useTransaction } from "@console/core/util/transaction";
import { useApiAuth } from "src/api";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { eq, and, gt, inArray } from "drizzle-orm";
import { workspace } from "@console/core/workspace/workspace.sql";
import { app, resource, stage } from "@console/core/app/app.sql";
import { awsAccount } from "@console/core/aws/aws.sql";
import { replicache_cvr } from "@console/core/replicache/replicache.sql";
import { createId } from "@console/core/util/sql";
import { mapValues } from "remeda";
import { log_poller } from "@console/core/log-poller/log-poller.sql";

const VERSION = 4;
export const handler = ApiHandler(async () => {
  await useApiAuth();
  const actor = useActor();

  if (actor.type === "public") {
    return {
      statusCode: 401,
    };
  }

  const body = useJsonBody();
  console.log("cookie", body.cookie);
  const lastSync =
    body.cookie && body.cookie.version === VERSION
      ? body.cookie.lastSync
      : new Date(0).toISOString();
  const oldCvrID =
    body.cookie && body.cookie.version === VERSION ? body.cookie.cvr : "";
  console.log("lastSync", lastSync);
  console.log("oldCvrID", oldCvrID);
  const result = {
    patch: [] as any[],
    lastSync,
    cvr: oldCvrID,
  };

  return await useTransaction(async (tx) => {
    const client = await Replicache.fromID(body.clientID);
    const oldCvr =
      (await tx
        .select({ data: replicache_cvr.data })
        .from(replicache_cvr)
        .where(eq(replicache_cvr.id, oldCvrID))
        .execute()
        .then((rows) => rows[0]?.data ?? {})) || {};

    if (actor.type === "user") {
      const workspaceID = useWorkspace();
      console.log("syncing user", actor.properties);
      if (!oldCvrID) {
        result.patch.push({
          op: "clear",
        });
        result.patch.push({
          op: "put",
          key: "/init",
          value: true,
        });
      }
      const tables = {
        workspace,
        user,
        awsAccount,
        app,
        stage,
        resource,
        log_poller,
      };
      const results: [string, { id: string; time_updated: string }[]][] = [];
      for (const [name, table] of Object.entries(tables)) {
        const rows = await tx
          .select({ id: table.id, time_updated: table.timeUpdated })
          .from(table)
          .where(
            and(
              eq(
                "workspaceID" in table ? table.workspaceID : table.id,
                workspaceID
              )
            )
          )
          .execute();
        results.push([name, rows]);
      }

      const toPut: Record<string, string[]> = {};
      const nextCvr: Record<string, string> = {};
      for (const [name, rows] of results) {
        const arr = [] as string[];
        for (const row of rows) {
          const key = `/${name}/${row.id}`;
          if (oldCvr[key] !== row.time_updated) {
            arr.push(row.id);
          }
          delete oldCvr[key];
          nextCvr[key] = row.time_updated;
        }
        toPut[name] = arr;
      }
      console.log(
        "toPut",
        mapValues(toPut, (value) => value.length)
      );
      console.log("toDel", oldCvr);

      // new data
      for (const [name, ids] of Object.entries(toPut)) {
        if (!ids.length) continue;
        const table = tables[name as keyof typeof tables];
        const rows = await tx
          .select()
          .from(table)
          .where(inArray(table.id, ids))
          .execute();
        for (const row of rows) {
          result.patch.push({
            op: "put",
            key: `/${name}/${row.id}`,
            value: row,
          });
        }
      }

      // remove deleted data
      for (const [key] of Object.entries(oldCvr)) {
        result.patch.push({
          op: "del",
          key,
        });
      }

      if (result.patch.length > 0) {
        const nextCvrID = createId();
        await tx
          .insert(replicache_cvr)
          .values({
            id: nextCvrID,
            data: nextCvr,
            actor,
          })
          .execute();
        result.cvr = nextCvrID;
      }
    }

    if (actor.type === "account") {
      console.log("syncing account", actor.properties);
      const first = new Date(lastSync).getTime() === 0;
      if (first) {
        result.patch.push({
          op: "clear",
        });
        result.patch.push({
          op: "put",
          key: "/init",
          value: true,
        });
      }
      const [users] = await Promise.all([
        await tx
          .select()
          .from(user)
          .where(
            and(
              eq(user.email, actor.properties.email),
              gt(user.timeUpdated, lastSync)
            )
          )
          .execute(),
      ]);

      const workspaces = await tx
        .select()
        .from(workspace)
        .leftJoin(user, eq(user.workspaceID, workspace.id))
        .where(
          and(
            eq(user.email, actor.properties.email),
            gt(workspace.timeUpdated, lastSync)
          )
        )
        .execute()
        .then((rows) => rows.map((row) => row.workspace));
      console.log("workspaces", workspaces);

      result.patch.push(
        ...users.map((item) => ({
          op: "put",
          key: `/user/${item.id}`,
          value: item,
        })),
        ...workspaces.map((item) => ({
          op: "put",
          key: `/workspace/${item.id}`,
          value: item,
        }))
      );
      result.lastSync =
        [...workspaces, ...users].sort((a, b) =>
          b.timeUpdated > a.timeUpdated ? 1 : -1
        )[0]?.timeUpdated || lastSync;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        lastMutationID: client?.mutationID || 0,
        patch: result.patch,
        cookie: {
          version: VERSION,
          lastSync: result.lastSync,
          cvr: result.cvr,
        },
      }),
    };
  });
});
