import { createSelectSchema } from "drizzle-zod";
import { app, resource, stage } from "./app.sql";
import { z } from "zod";
import { zod } from "../util/zod";
import {
  createTransaction,
  createTransactionEffect,
  useTransaction,
} from "../util/transaction";
import { createId } from "@paralleldrive/cuid2";
import { useWorkspace } from "../actor";
import { awsAccount } from "../aws/aws.sql";
import { and, eq, inArray, sql } from "drizzle-orm";
import { AWS, Credentials } from "../aws";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  S3Client,
} from "@aws-sdk/client-s3";
import { Enrichers } from "./resource";
import { db } from "../drizzle";
import { event } from "../event";
import { Replicache } from "../replicache";

export * as Stage from "./stage";

export const Events = {
  Connected: event("app.stage.connected", {
    stageID: z.string().nonempty(),
  }),
  Updated: event("app.stage.updated", {
    stageID: z.string().nonempty(),
  }),
  ResourcesUpdated: event("app.stage.resources_updated", {
    stageID: z.string().nonempty(),
  }),
  UsageRequested: event("app.stage.usage_requested", {
    stageID: z.string().nonempty(),
    daysOffset: z.number().int().min(1),
  }),
};

export const Info = createSelectSchema(stage, {
  id: (schema) => schema.id.cuid2(),
  name: (schema) => schema.name.trim().nonempty(),
  appID: (schema) => schema.appID.cuid2(),
  workspaceID: (schema) => schema.workspaceID.cuid2(),
  region: (schema) => schema.region.trim().nonempty(),
  awsAccountID: (schema) => schema.awsAccountID.cuid2(),
});
export type Info = z.infer<typeof Info>;

export const fromID = zod(Info.shape.id, (stageID) =>
  useTransaction((tx) =>
    tx
      .select()
      .from(stage)
      .where(and(eq(stage.workspaceID, useWorkspace()), eq(stage.id, stageID)))
      .execute()
      .then((x) => x[0])
  )
);

export const fromName = zod(
  Info.pick({
    appID: true,
    name: true,
    region: true,
    awsAccountID: true,
  }),
  (input) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(stage)
        .where(
          and(
            eq(stage.workspaceID, useWorkspace()),
            eq(stage.name, input.name),
            eq(stage.region, input.region),
            eq(stage.appID, input.appID),
            eq(stage.awsAccountID, input.awsAccountID)
          )
        )
        .execute()
        .then((x) => x[0])
    )
);

export const list = zod(z.void(), () =>
  useTransaction((tx) =>
    tx
      .select()
      .from(stage)
      .execute()
      .then((rows) => rows)
  )
);

export const connect = zod(
  Info.pick({
    name: true,
    appID: true,
    id: true,
    awsAccountID: true,
    region: true,
  }).partial({
    id: true,
  }),
  (input) =>
    createTransaction(async (tx) => {
      const id = input.id ?? createId();
      await tx
        .insert(stage)
        .values({
          id,
          appID: input.appID,
          workspaceID: useWorkspace(),
          awsAccountID: input.awsAccountID,
          name: input.name,
          region: input.region,
        })
        .onDuplicateKeyUpdate({
          set: {
            awsAccountID: input.awsAccountID,
            region: input.region,
          },
        })
        .execute();
      const { insertID } = await tx
        .select({ insertID: stage.id })
        .from(stage)
        .where(
          and(
            eq(stage.workspaceID, useWorkspace()),
            eq(stage.appID, input.appID),
            eq(stage.name, input.name),
            eq(stage.region, input.region),
            eq(stage.awsAccountID, input.awsAccountID)
          )
        )
        .execute()
        .then((x) => x[0]!);
      await createTransactionEffect(() =>
        Events.Connected.publish({
          stageID: insertID,
        })
      );
      return insertID;
    })
);

export const syncMetadata = zod(
  z.object({
    stageID: Info.shape.id,
    credentials: z.custom<Credentials>(),
  }),
  async (input) => {
    console.log("syncing metadata", input.stageID);
    const row = await db
      .select({
        app: app.name,
        stage: stage.name,
        region: stage.region,
      })
      .from(stage)
      .innerJoin(app, eq(stage.appID, app.id))
      .where(
        and(eq(stage.id, input.stageID), eq(stage.workspaceID, useWorkspace()))
      )
      .execute()
      .then((x) => x[0]);
    if (!row) {
      return;
    }
    console.log(row.app, row.stage, row.region);
    const bucket = await AWS.Account.bootstrap({
      credentials: input.credentials,
      region: row.region,
    }).then((r) => r?.bucket);
    if (!bucket) return;
    const s3 = new S3Client({
      credentials: input.credentials,
      region: row.region,
    });
    const key = `stackMetadata/app.${row.app}/stage.${row.stage}/`;
    console.log("listing", key, "for", bucket);
    const list = await s3
      .send(
        new ListObjectsV2Command({
          Prefix: key,
          Bucket: bucket,
        })
      )
      .catch((err) => {
        if (err.name === "AccessDenied") return;
        throw err;
      });
    if (!list) {
      console.log("could not list from bucket");
      return;
    }
    console.log("found", list.Contents?.length, "stacks");
    if (!list.Contents?.length) {
      await remove(input.stageID);
      return;
    }
    const results = await Promise.all(
      list.Contents?.map(async (obj) => {
        const stackID = obj.Key?.split("/").pop()!.split(".")[1];
        const result = await s3
          .send(
            new GetObjectCommand({
              Key: obj.Key!,
              Bucket: bucket,
            })
          )
          .catch((err) => {
            if (err instanceof NoSuchKey) {
              return;
            }
            throw err;
          });
        if (!result) return [];
        const body = await result
          .Body!.transformToString()
          .then((x) => JSON.parse(x));
        const r = [];
        body.push({
          type: "Stack",
          id: stackID,
          addr: stackID,
          data: {},
        });
        for (let res of body) {
          const { type } = res;
          const enrichment =
            type in Enrichers
              ? await Enrichers[type as keyof typeof Enrichers](
                  res,
                  input.credentials,
                  row.region
                ).catch(() => ({}))
              : {};
          r.push({
            ...res,
            stackID,
            enrichment,
          });
        }
        return r;
      }) || []
    ).then((x) => x.flat());
    s3.destroy();

    return createTransaction(async (tx) => {
      const existing = await tx
        .select({
          id: resource.id,
          addr: resource.addr,
        })
        .from(resource)
        .where(
          and(
            eq(resource.stageID, input.stageID),
            eq(resource.workspaceID, useWorkspace())
          )
        )
        .execute()
        .then((x) => new Map(x.map((x) => [x.addr, x.id] as const)));
      if (results.length)
        await tx
          .insert(resource)
          .values(
            results.map((res) => {
              const id = existing.get(res.addr) || createId();
              existing.delete(res.addr);
              return {
                workspaceID: useWorkspace(),
                cfnID: res.id,
                constructID: res.id,
                addr: res.addr,
                stackID: res.stackID,
                stageID: input.stageID,
                id,
                type: res.type,
                metadata: res.data,
                enrichment: res.enrichment,
              };
            })
          )
          .onDuplicateKeyUpdate({
            set: {
              addr: sql`VALUES(addr)`,
              stackID: sql`VALUES(stack_id)`,
              type: sql`VALUES(type)`,
              metadata: sql`VALUES(metadata)`,
              enrichment: sql`VALUES(enrichment)`,
            },
          })
          .execute();

      const toDelete = [...existing.values()];
      console.log("deleting", toDelete.length, "resources");
      if (toDelete.length)
        await tx
          .delete(resource)
          .where(
            and(
              eq(resource.stageID, input.stageID),
              eq(resource.workspaceID, useWorkspace()),
              inArray(resource.id, toDelete)
            )
          );
      await createTransactionEffect(() => Replicache.poke());
      await createTransactionEffect(() =>
        Events.ResourcesUpdated.publish({
          stageID: input.stageID,
        })
      );
    });
  }
);

export type StageCredentials = Exclude<
  Awaited<ReturnType<typeof assumeRole>>,
  undefined
>;

export const assumeRole = zod(Info.shape.id, async (stageID) => {
  const result = await useTransaction((tx) =>
    tx
      .select({
        accountID: awsAccount.accountID,
        region: stage.region,
        name: stage.name,
        app: app.name,
      })
      .from(awsAccount)
      .innerJoin(stage, eq(stage.awsAccountID, awsAccount.id))
      .innerJoin(app, eq(stage.appID, app.id))
      .where(and(eq(stage.id, stageID), eq(stage.workspaceID, useWorkspace())))
      .execute()
      .then((rows) => rows.at(0))
  );
  if (!result) return;
  const credentials = await AWS.assumeRole(result.accountID);
  if (!credentials) return;
  return {
    credentials,
    region: result.region,
    stageID,
    stage: result.name,
    app: result.app,
    awsAccountID: result.accountID,
  };
});

export const remove = zod(Info.shape.id, (stageID) =>
  createTransaction(async (tx) => {
    console.log("removing stage", stageID);
    await tx
      .delete(stage)
      .where(and(eq(stage.id, stageID), eq(stage.workspaceID, useWorkspace())))
      .execute();
    await tx
      .delete(resource)
      .where(
        and(
          eq(resource.stageID, stageID),
          eq(resource.workspaceID, useWorkspace())
        )
      )
      .execute();
    await createTransactionEffect(() => Replicache.poke());
  })
);
