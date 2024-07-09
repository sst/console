import { useActor } from "@console/core/actor";
import {
  replicache_client_group,
  replicache_client,
} from "@console/core/replicache/replicache.sql";
import { createTransaction } from "@console/core/util/transaction";
import { and, eq } from "drizzle-orm";
import { PushRequest } from "replicache";
import { NotPublic, withApiAuth } from "../api";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { server } from "./server";
import { Replicache } from "@console/core/replicache";
import { VisibleError } from "@console/core/util/error";

export const handler = ApiHandler(
  withApiAuth(async () => {
    NotPublic();
    const actor = useActor();

    const body: PushRequest = useJsonBody();
    if (body.pushVersion !== 1)
      return {
        statusCode: 307,
        headers: {
          Location: "/replicache/push",
        },
      };

    for (const mutation of body.mutations) {
      await createTransaction(
        async (tx) => {
          const group = await tx
            .select({
              id: replicache_client_group.id,
              cvrVersion: replicache_client_group.cvrVersion,
              clientVersion: replicache_client_group.clientVersion,
              actor: replicache_client_group.actor,
            })
            .from(replicache_client_group)
            .for("update")
            .where(and(eq(replicache_client_group.id, body.clientGroupID)))
            .execute()
            .then(
              (rows) =>
                rows.at(0) ?? {
                  id: body.clientGroupID,
                  actor: actor,
                  cvrVersion: 0,
                  clientVersion: 0,
                },
            );

          // if (!equals(group.actor, actor)) {
          //   throw new Error(
          //     `${actor} is not authorized to push to ${body.clientGroupID}}`
          //   );
          // }

          const client = await tx
            .select({
              id: replicache_client.id,
              clientGroupID: replicache_client.clientGroupID,
              mutationID: replicache_client.mutationID,
              clientVersion: replicache_client.clientVersion,
            })
            .from(replicache_client)
            .for("update")
            .where(and(eq(replicache_client.id, mutation.clientID)))
            .execute()
            .then(
              (rows) =>
                rows.at(0) || {
                  id: body.clientGroupID,
                  clientGroupID: body.clientGroupID,
                  mutationID: 0,
                  clientVersion: 0,
                },
            );

          const nextClientVersion = group.clientVersion + 1;
          const nextMutationID = client.mutationID + 1;

          if (mutation.id < nextMutationID) {
            console.log(
              `Mutation ${mutation.id} has already been processed - skipping`,
            );
            return;
          }

          if (mutation.id > nextMutationID) {
            throw new Error(
              `Mutation ${mutation.id} is from the future - aborting`,
            );
          }

          const { args, name } = mutation;
          console.log("processing", mutation.id, name);
          try {
            await server.execute(name, args);
          } catch (ex) {
            if (!(ex instanceof VisibleError)) console.error(ex);
          }
          console.log("done processing", mutation.id, name);

          await tx
            .insert(replicache_client_group)
            .values({
              id: body.clientGroupID,
              clientVersion: nextClientVersion,
              cvrVersion: group.cvrVersion,
              actor,
            })
            .onDuplicateKeyUpdate({
              set: {
                cvrVersion: group.cvrVersion,
                clientVersion: nextClientVersion,
              },
            })
            .execute();

          await tx
            .insert(replicache_client)
            .values({
              id: mutation.clientID,
              clientGroupID: group.id,
              mutationID: nextMutationID,
              clientVersion: nextClientVersion,
            })
            .onDuplicateKeyUpdate({
              set: {
                clientGroupID: group.id,
                mutationID: nextMutationID,
                clientVersion: nextClientVersion,
              },
            })
            .execute();
        },
        {
          isolationLevel: "repeatable read",
        },
      );
    }

    if (actor.type === "user") await Replicache.poke();

    return {
      statusCode: 200,
    };
  }),
);
