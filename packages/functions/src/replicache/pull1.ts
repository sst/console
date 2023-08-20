import { DateTime } from "luxon";
import { useActor, useWorkspace } from "@console/core/actor";
import { Replicache } from "@console/core/replicache";
import { user } from "@console/core/user/user.sql";
import { useTransaction } from "@console/core/util/transaction";
import { useApiAuth } from "src/api";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { eq, and, gt, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { workspace } from "@console/core/workspace/workspace.sql";
import { usage } from "@console/core/billing/billing.sql";
import { app, resource, stage } from "@console/core/app/app.sql";
import { awsAccount } from "@console/core/aws/aws.sql";
import {
  replicache_client,
  replicache_client_group,
  replicache_cvr,
} from "@console/core/replicache/replicache.sql";
import { lambdaPayload } from "@console/core/lambda/lambda.sql";
import { createId } from "@console/core/util/sql";
import { equals, groupBy, keys, map, mapValues, pipe } from "remeda";
import { log_poller, log_search } from "@console/core/log/log.sql";
import { PatchOperation, PullRequestV1, PullResponseV1 } from "replicache";

const VERSION = 4;
export const handler = ApiHandler(async () => {
  await useApiAuth();
  const actor = useActor();

  if (actor.type === "public") {
    return {
      statusCode: 401,
    };
  }

  const req: PullRequestV1 = useJsonBody();

  const resp = await useTransaction(
    async (tx): Promise<PullResponseV1 | undefined> => {
      const patch: PatchOperation[] = [];

      const group = await tx
        .select({
          id: replicache_client_group.id,
          cvrVersion: replicache_client_group.cvrVersion,
          clientVersion: replicache_client_group.clientVersion,
          actor: replicache_client_group.actor,
        })
        .from(replicache_client_group)
        .for("update")
        .where(and(eq(replicache_client_group.id, req.clientGroupID)))
        .execute()
        .then(
          (rows) =>
            rows.at(0) ?? {
              id: req.clientGroupID,
              actor,
              cvrVersion: 0,
              clientVersion: 0,
            }
        );

      if (!equals(group.actor, actor)) return;

      const oldCvr = await tx
        .select({
          data: replicache_cvr.data,
          clientVersion: replicache_cvr.clientVersion,
        })
        .from(replicache_cvr)
        .where(
          and(
            eq(replicache_cvr.clientGroupID, req.clientGroupID),
            eq(replicache_cvr.id, req.cookie as number)
          )
        )
        .execute()
        .then((rows) => rows.at(0));
      const cvr = oldCvr ?? {
        data: {},
        clientVersion: 0,
      };
      const toPut: Record<string, string[]> = {};
      const nextCvr = {
        data: {} as Record<string, number>,
        version: group.cvrVersion + 1,
      };

      if (!oldCvr) {
        patch.push({
          op: "clear",
        });
        patch.push({
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
        log_search,
        lambdaPayload,
        usage,
      };

      const results: [string, { id: string; time_updated: string }[]][] = [];

      if (actor.type === "user") {
        console.log("syncing user", actor.properties);

        const workspaceID = useWorkspace();
        for (const [name, table] of Object.entries(tables)) {
          const rows = await tx
            .select({ id: table.id, time_updated: table.timeUpdated })
            .from(table)
            .where(
              and(
                eq(
                  "workspaceID" in table ? table.workspaceID : table.id,
                  workspaceID
                ),
                ...(name === "log_search" && "userID" in table
                  ? [eq(table.userID, actor.properties.userID)]
                  : []),
                ...(name === "usage" && "day" in table
                  ? [
                      gte(
                        table.day,
                        DateTime.now().toUTC().startOf("month").toSQLDate()!
                      ),
                    ]
                  : [])
              )
            )
            .execute();
          results.push([name, rows]);
        }
      }

      if (actor.type === "account") {
        console.log("syncing account", actor.properties);

        const [users] = await Promise.all([
          await tx
            .select({
              id: user.id,
              workspaceID: user.workspaceID,
              time_updated: user.timeUpdated,
            })
            .from(user)
            .where(
              and(
                eq(user.email, actor.properties.email),
                isNull(user.timeDeleted)
              )
            )
            .execute(),
        ]);
        results.push(["user", users]);

        const workspaces = await tx
          .select({
            id: workspace.id,
            time_updated: workspace.timeUpdated,
          })
          .from(workspace)
          .leftJoin(user, eq(user.workspaceID, workspace.id))
          .where(
            and(
              eq(user.email, actor.properties.email),
              isNull(user.timeDeleted)
            )
          )
          .execute();
        results.push(["workspace", workspaces]);
      }

      for (const [name, rows] of results) {
        const arr = [] as string[];
        for (const row of rows) {
          const key = `/${name}/${row.id}`;
          const version = new Date(row.time_updated).getTime();
          if (cvr.data[key] !== version) {
            arr.push(row.id);
          }
          delete cvr.data[key];
          nextCvr.data[key] = version;
        }
        toPut[name] = arr;
      }

      console.log(
        "toPut",
        mapValues(toPut, (value) => value.length)
      );

      console.log("toDel", cvr.data);

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
          patch.push({
            op: "put",
            key: `/${name}/${row.id}`,
            value: row,
          });
        }
      }

      // remove deleted data
      for (const [key] of Object.entries(cvr.data)) {
        patch.push({
          op: "del",
          key,
        });
      }

      if (patch.length > 0) {
        await tx
          .delete(replicache_cvr)
          .where(
            and(
              eq(replicache_cvr.clientGroupID, req.clientGroupID),
              lte(replicache_cvr.timeUpdated, sql`now() - interval 7 day`)
            )
          )
          .execute();

        await tx
          .insert(replicache_client_group)
          .values({
            id: req.clientGroupID,
            clientVersion: group.clientVersion,
            cvrVersion: nextCvr.version,
            actor,
          })
          .onDuplicateKeyUpdate({
            set: {
              cvrVersion: nextCvr.version,
            },
          })
          .execute();

        await tx
          .insert(replicache_cvr)
          .values({
            id: nextCvr.version,
            data: nextCvr.data,
            clientGroupID: req.clientGroupID,
            clientVersion: group.clientVersion,
          })
          .execute();

        const clients = await tx
          .select({
            id: replicache_client.id,
            mutationID: replicache_client.mutationID,
            clientVersion: replicache_client.clientVersion,
          })
          .from(replicache_client)
          .where(
            and(
              eq(replicache_client.clientGroupID, req.clientGroupID),
              gt(replicache_client.clientVersion, cvr.clientVersion)
            )
          )
          .execute();

        return {
          patch,
          cookie: nextCvr.version,
          lastMutationIDChanges: Object.fromEntries(
            clients.map((c) => [c.id, c.mutationID] as const)
          ),
        };
      }

      return {
        patch: [],
        cookie: req.cookie,
        lastMutationIDChanges: {},
      };
    }
  );

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(resp),
  };
});