import { createSelectSchema } from "drizzle-zod";
import { app, resource, stage } from "./app.sql";
import { z } from "zod";
import { State } from "../state/";
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
import { AWS } from "../aws";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchBucket,
  NoSuchKey,
  S3Client,
} from "@aws-sdk/client-s3";
import { Enrichers, Resource } from "./resource";
import { db } from "../drizzle";
import { event } from "../event";
import { Replicache } from "../replicache";
import { Pulumi } from "../pulumi";
import { issueSubscriber } from "../issue/issue.sql";

export * as Stage from "./stage";

export const Events = {
  Connected: event(
    "app.stage.connected",
    z.object({
      stageID: z.string().nonempty(),
    })
  ),
  Updated: event(
    "app.stage.updated",
    z.object({
      stageID: z.string().nonempty(),
    })
  ),
  ResourcesUpdated: event(
    "app.stage.resources_updated",
    z.object({
      stageID: z.string().nonempty(),
    })
  ),
  UsageRequested: event(
    "app.stage.usage_requested",
    z.object({
      stageID: z.string().nonempty(),
      daysOffset: z.number().int().min(1),
    })
  ),
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
      console.log({ input });
      const id = input.id ?? createId();
      const result = await tx
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
      console.log(result);
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

export const syncMetadata = zod(z.custom<StageCredentials>(), async (input) => {
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
  console.log(input.app, input.stage, input.region);
  const bootstrap = await AWS.Account.bootstrap(input);
  if (!bootstrap) return;
  const resources = [] as {
    [key in Resource.Info["type"]]: {
      type: key;
      id: string;
      stackID: string;
      addr: string;
      data: Resource.InfoByType<key>["metadata"];
      enrichment: Resource.InfoByType<key>["enrichment"];
    };
  }[Resource.Info["type"]][];
  const s3 = new S3Client(input);
  const key = `stackMetadata/app.${input.app}/stage.${input.stage}/`;
  console.log("listing", key, "for", bootstrap.bucket);
  const list = await s3
    .send(
      new ListObjectsV2Command({
        Prefix: key,
        Bucket: bootstrap.bucket,
      })
    )
    .catch((err) => {
      if (err.name === "AccessDenied") return;
      if (err.name === "NoSuchBucket") return;
      throw err;
    });
  if (!list) {
    console.log("could not list from bucket");
    return;
  }
  if (!list.Contents?.length) {
    const ion = await AWS.Account.bootstrapIon(input);
    if (ion) {
      const state = await s3
        .send(
          new GetObjectCommand({
            Key: `app/${input.app}/${input.stage}.json`,
            Bucket: ion.bucket,
          })
        )
        .catch(() => {});
      if (state) return;
    }
    await remove(input.stageID);
    return;
  }
  console.log("found", list.Contents?.length, "stacks");
  const results: any[] = [];
  for (const obj of list.Contents) {
    const stackID = obj.Key?.split("/").pop()!.split(".")[1];
    const result = await s3
      .send(
        new GetObjectCommand({
          Key: obj.Key!,
          Bucket: bootstrap.bucket,
        })
      )
      .catch((err) => {
        if (err.name === "AccessDenied") return;
        if (err.name === "NoSuchBucket") return;
        if (err.name === "NoSuchKey") return;
        throw err;
      });
    if (!result) continue;
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
              input.region
            ).catch(() => ({}))
          : {};
      r.push({
        ...res,
        stackID,
        enrichment,
      });
    }
    results.push(...r);
  }
  resources.push(...results);
  s3.destroy();
  if (!resources.length) {
    return;
  }

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
    if (resources.length)
      await tx
        .insert(resource)
        .values(
          resources.map((res) => {
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

    const stacks = resources.filter((x) => x.type === "Stack");
    const unsupported =
      stacks.length ===
      stacks.filter(
        (x) =>
          // @ts-ignore
          !x.enrichment.version ||
          // @ts-ignore
          parseVersion(x.enrichment.version) < MINIMUM_VERSION
      ).length;

    await tx
      .update(stage)
      .set({ unsupported })
      .where(
        and(eq(stage.id, input.stageID), eq(stage.workspaceID, useWorkspace()))
      );

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
});

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
  createTransaction(
    async (tx) => {
      console.log("removing stage", stageID);
      await tx
        .delete(stage)
        .where(
          and(eq(stage.id, stageID), eq(stage.workspaceID, useWorkspace()))
        )
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
      await tx
        .delete(issueSubscriber)
        .where(
          and(
            eq(issueSubscriber.stageID, stageID),
            eq(issueSubscriber.workspaceID, useWorkspace())
          )
        )
        .execute();
      await createTransactionEffect(() => Replicache.poke());
    },
    {
      isolationLevel: "read uncommitted",
    }
  )
);

function parseVersion(input: string) {
  return input
    .split(".")
    .map((item) => parseInt(item))
    .reduce((acc, val, i) => acc + val * Math.pow(1000, 2 - i), 0);
}
const MINIMUM_VERSION = parseVersion("2.19.2");
