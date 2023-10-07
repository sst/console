import { DateTime } from "luxon";
import { useActor, useWorkspace } from "@console/core/actor";
import { user } from "@console/core/user/user.sql";
import { createTransaction } from "@console/core/util/transaction";
import { NotPublic, withApiAuth } from "../api";
import { ApiHandler, Response, useJsonBody } from "sst/node/api";
import {
  eq,
  and,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  SQLWrapper,
  sql,
  SQL,
} from "drizzle-orm";
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
import { equals, mapValues } from "remeda";
import { log_poller, log_search } from "@console/core/log/log.sql";
import { PatchOperation, PullRequest, PullResponseV1 } from "replicache";
import { warning } from "@console/core/warning/warning.sql";
import {
  issue,
  issueSubscriber,
  issueCount,
} from "@console/core/issue/issue.sql";
import { MySqlColumn } from "drizzle-orm/mysql-core";

export const TABLES = {
  workspace,
  user,
  awsAccount,
  app,
  stage,
  resource,
  log_poller,
  log_search,
  lambdaPayload,
  warning,
  issue,
  issueSubscriber,
  issueCount,
  usage,
};

type TableName = keyof typeof TABLES;

const TABLE_KEY = {
  issue: [issue.stageID, issue.id],
  resource: [resource.stageID, resource.id],
  issueCount: [issueCount.group, issueCount.id],
  warning: [warning.stageID, warning.type, warning.id],
} as {
  [key in TableName]?: MySqlColumn[];
};

export const handler = ApiHandler(
  withApiAuth(async () => {
    NotPublic();
    const actor = useActor();
    console.log("actor", actor);

    const req: PullRequest = useJsonBody();
    console.log("request", req);
    if (req.pullVersion !== 1) {
      throw new Response({
        statusCode: 307,
        headers: {
          location: "/replicache/pull",
        },
      });
    }

    const resp = await createTransaction(
      async (tx): Promise<PullResponseV1 | undefined> => {
        const patch: PatchOperation[] = [];

        await tx
          .insert(replicache_client_group)
          .ignore()
          .values({
            id: req.clientGroupID,
            cvrVersion: 0,
            actor,
            clientVersion: (req.cookie as number) ?? 0,
          });

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
          .then((rows) => rows.at(0)!);

        if (!equals(group.actor, actor)) {
          console.log("compare failed", group.actor, actor);
          return;
        }

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

        const toPut: Record<string, { id: string; key: string }[]> = {};
        const nextCvr = {
          data: {} as Record<string, number>,
          version: Math.max(req.cookie as number, group.cvrVersion) + 1,
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

        const results: [
          string,
          { id: string; version: string; key: string }[]
        ][] = [];

        if (actor.type === "user") {
          console.log("syncing user");

          const tableFilters = {
            log_search: eq(log_search.userID, actor.properties.userID),
            usage: gte(
              usage.day,
              DateTime.now().toUTC().startOf("month").toSQLDate()!
            ),
            issueCount: gte(
              issueCount.hour,
              DateTime.now()
                .toUTC()
                .startOf("hour")
                .minus({ day: 1 })
                .toSQL({ includeOffset: false })!
            ),
          } satisfies {
            [key in keyof typeof TABLES]?: SQLWrapper;
          };

          const workspaceID = useWorkspace();
          for (const [name, table] of Object.entries(TABLES)) {
            const key = TABLE_KEY[name as TableName] ?? [table.id];
            const query = tx
              .select({
                id: table.id,
                version: table.timeUpdated,
                key: sql.join([
                  sql`concat_ws(`,
                  sql.join([sql`'/'`, sql`''`, sql`${name}`, ...key], sql`, `),
                  sql.raw(`)`),
                ]) as SQL<string>,
              })
              .from(table)
              .where(
                and(
                  eq(
                    "workspaceID" in table ? table.workspaceID : table.id,
                    workspaceID
                  ),
                  ...(name in tableFilters
                    ? [tableFilters[name as keyof typeof tableFilters]]
                    : [])
                )
              );
            const rows = await query.execute();
            results.push([name, rows]);
          }
        }

        if (actor.type === "account") {
          console.log("syncing account");

          const [users] = await Promise.all([
            await tx
              .select({
                id: user.id,
                key: sql<string>`concat('/user/', ${user.id})`,
                version: user.timeUpdated,
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
              version: workspace.timeUpdated,
              key: sql<string>`concat('/workspace/', ${workspace.id})`,
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
          const arr = [];
          for (const row of rows) {
            const version = new Date(row.version).getTime();
            if (cvr.data[row.key] !== version) {
              arr.push(row);
            }
            delete cvr.data[row.key];
            nextCvr.data[row.key] = version;
          }
          toPut[name] = arr;
        }

        console.log(
          "toPut",
          mapValues(toPut, (value) => value.length)
        );

        console.log("toDel", cvr.data);

        // new data
        for (const [name, items] of Object.entries(toPut)) {
          const ids = items.map((item) => item.id);
          const keys = Object.fromEntries(
            items.map((item) => [item.id, item.key])
          );

          if (!ids.length) continue;
          const table = TABLES[name as keyof typeof TABLES];
          const rows = await tx
            .select()
            .from(table)
            .where(
              and(
                "workspaceID" in table && actor.type === "user"
                  ? eq(table.workspaceID, useWorkspace())
                  : undefined,
                inArray(table.id, ids)
              )
            )
            .execute();
          for (const row of rows) {
            const key = keys[row.id]!;
            patch.push({
              op: "put",
              key,
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

        const lastMutationIDChanges = Object.fromEntries(
          clients.map((c) => [c.id, c.mutationID] as const)
        );
        if (patch.length > 0) {
          console.log("inserting", req.clientGroupID);
          await tx
            .update(replicache_client_group)
            .set({
              cvrVersion: nextCvr.version,
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
            .onDuplicateKeyUpdate({
              set: {
                data: nextCvr.data,
              },
            })
            .execute();

          await tx
            .delete(replicache_cvr)
            .where(
              and(
                eq(replicache_cvr.clientGroupID, req.clientGroupID),
                lt(replicache_cvr.id, nextCvr.version - 10)
              )
            );

          return {
            patch,
            cookie: nextCvr.version,
            lastMutationIDChanges,
          };
        }

        return {
          patch: [],
          cookie: req.cookie,
          lastMutationIDChanges,
        };
      }
    );

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(resp),
    };
  })
);
