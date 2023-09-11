import { DateTime } from "luxon";
import { provideActor, useActor, useWorkspace } from "@console/core/actor";
import { user } from "@console/core/user/user.sql";
import { createTransaction } from "@console/core/util/transaction";
import { NotPublic, useApiAuth } from "../api";
import { ApiHandler, Response, useJsonBody } from "sst/node/api";
import { eq, and, gt, gte, inArray, isNull, lte, sql, lt } from "drizzle-orm";
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
import { issue, issueSubscriber } from "@console/core/issue/issue.sql";
import { compress } from "@console/core/util/compress";

export const handler = ApiHandler(async () => {
  provideActor(await useApiAuth());
  NotPublic();
  const actor = useActor();
  console.log(actor);

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
              clientVersion: (req.cookie as number) ?? 0,
            },
        );

      console.log("compare", group, actor);
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
            eq(replicache_cvr.id, req.cookie as number),
          ),
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
        warning,
        issue,
        issueSubscriber,
        usage,
      };

      const results: [string, { id: string; time_updated: string }[]][] = [];

      if (actor.type === "user") {
        console.log("syncing user");

        const workspaceID = useWorkspace();
        for (const [name, table] of Object.entries(tables)) {
          const rows = await tx
            .select({ id: table.id, time_updated: table.timeUpdated })
            .from(table)
            .where(
              and(
                eq(
                  "workspaceID" in table ? table.workspaceID : table.id,
                  workspaceID,
                ),
                ...(name === "log_search" && "userID" in table
                  ? [eq(table.userID, actor.properties.userID)]
                  : []),
                ...(name === "usage" && "day" in table
                  ? [
                      gte(
                        table.day,
                        DateTime.now().toUTC().startOf("month").toSQLDate()!,
                      ),
                    ]
                  : []),
              ),
            )
            .execute();
          results.push([name, rows]);
        }
      }

      if (actor.type === "account") {
        console.log("syncing account");

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
                isNull(user.timeDeleted),
              ),
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
              isNull(user.timeDeleted),
            ),
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
        mapValues(toPut, (value) => value.length),
      );

      console.log("toDel", cvr.data);

      // new data
      for (const [name, ids] of Object.entries(toPut)) {
        if (!ids.length) continue;
        const table = tables[name as keyof typeof tables];
        const rows = await tx
          .select()
          .from(table)
          .where(
            and(
              "workspaceID" in table && actor.type === "user"
                ? eq(table.workspaceID, useWorkspace())
                : undefined,
              inArray(table.id, ids),
            ),
          )
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
            gt(replicache_client.clientVersion, cvr.clientVersion),
          ),
        )
        .execute();

      const lastMutationIDChanges = Object.fromEntries(
        clients.map((c) => [c.id, c.mutationID] as const),
      );
      if (patch.length > 0) {
        await tx
          .delete(replicache_cvr)
          .where(
            and(
              eq(replicache_cvr.clientGroupID, req.clientGroupID),
              lte(replicache_cvr.timeUpdated, sql`now() - interval 7 day`),
            ),
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

        const data = JSON.stringify(nextCvr.data);
        const compressed = await compress(data);
        console.log(
          "compare",
          compressed.toString("base64").length,
          Buffer.from(data).toString("base64").length,
        );
        await tx
          .insert(replicache_cvr)
          .values({
            id: nextCvr.version,
            data: nextCvr.data,
            clientGroupID: req.clientGroupID,
            clientVersion: group.clientVersion,
          })
          .execute();

        await tx
          .delete(replicache_cvr)
          .where(
            and(
              eq(replicache_cvr.clientGroupID, req.clientGroupID),
              lt(replicache_cvr.id, nextCvr.version - 10),
            ),
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
    },
  );

  console.log("here", resp);

  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(resp),
  };
});
