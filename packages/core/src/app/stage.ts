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
  const bootstrap = await Promise.all([
    AWS.Account.bootstrap(input),
    AWS.Account.bootstrapIon(input),
  ]).then((x) => x.flatMap((x) => (x ? [x] : [])));
  console.log("bootstrap", bootstrap);
  if (!bootstrap.length) return;
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
  let missing = true;
  const s3 = new S3Client(input);
  for (const b of bootstrap) {
    if (b.version === "normal") {
      const key = `stackMetadata/app.${input.app}/stage.${input.stage}/`;
      console.log("listing", key, "for", b.bucket);
      const list = await s3
        .send(
          new ListObjectsV2Command({
            Prefix: key,
            Bucket: b.bucket,
          })
        )
        .catch((err) => {
          if (err.name === "AccessDenied") return;
          if (err.name === "NoSuchBucket") return;
          throw err;
        });
      if (!list) {
        console.log("could not list from bucket");
        continue;
      }
      if (!list.Contents?.length) {
        continue;
      }
      console.log("found", list.Contents?.length, "stacks");
      const results: any[] = [];
      for (const obj of list.Contents) {
        const stackID = obj.Key?.split("/").pop()!.split(".")[1];
        const result = await s3
          .send(
            new GetObjectCommand({
              Key: obj.Key!,
              Bucket: b.bucket,
            })
          )
          .catch((err) => {
            if (err instanceof NoSuchKey) {
              return;
            }
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
      missing = false;
    }

    if (b.version === "ion") {
      console.log(`app/${input.app}/${input.stage}.json`);
      const result = await s3
        .send(
          new GetObjectCommand({
            Bucket: b.bucket,
            Key: `app/${input.app}/${input.stage}.json`,
          })
        )
        .catch((err) => {
          if (err instanceof NoSuchKey) {
            return;
          }
          throw err;
        });
      if (!result) continue;
      const checkpoint = JSON.parse(await result.Body?.transformToString()!)
        .checkpoint.latest;
      const stackID = checkpoint?.resources?.[0].urn;
      if (!stackID) continue;

      for (const res of checkpoint.resources) {
        console.log(JSON.stringify(res, null, 4));
        const base = {
          id: Pulumi.nameFromURN(res.urn),
          addr: res.urn,
          stackID,
          data: {},
        };

        if (res.type === "pulumi:pulumi:Stack") {
          resources.push({
            ...base,
            type: "Stack",
            data: {},
            enrichment: {
              outputs: Object.entries(res.outputs || {})
                .filter(([key]) => !key.startsWith("_"))
                .map(([key, value]) => ({
                  OutputKey: key,
                  OutputValue: value as string,
                })),
              version: "3.0.0",
            },
          });
        }

        if (res.type === "sst:aws:Function") {
          if (res.outputs?._metadata.internal) continue;
          const child = checkpoint.resources.find(
            (child: any) =>
              child.parent === res.urn &&
              child.type === "aws:lambda/function:Function"
          );
          if (!child) continue;
          resources.push({
            ...base,
            type: "Function",
            data: {
              runtime: child.outputs?.runtime,
              arn: child.outputs?.arn,
              handler: res.outputs?._metadata.handler,
              localId: base.addr,
              secrets: [],
              missingSourcemap: undefined,
              prefetchSecrets: undefined,
            },
            enrichment: {
              runtime: child.outputs?.runtime,
              size: child.outputs?.sourceCodeSize,
              live:
                child.outputs?.environment?.variables?.SST_FUNCTION_ID != null,
            },
          });
        }

        if (res.type === "sst:aws:ApiGatewayV2") {
          const routes = checkpoint.resources.filter(
            (child: any) =>
              child.parent === res.urn &&
              child.type === "aws:apigatewayv2/route:Route"
          );
          const api = checkpoint.resources.find(
            (child: any) =>
              child.parent === res.urn &&
              child.type === "aws:apigatewayv2/api:Api"
          );

          resources.push({
            ...base,
            type: "Api",
            enrichment: {},
            data: {
              url: api.outputs?.apiEndpoint,
              routes: routes.flatMap((route: any) => {
                const [, target] = route.outputs?.target?.split("/");
                if (!target) return [];
                const integration = checkpoint.resources.find(
                  (r: any) =>
                    r.type === "aws:apigatewayv2/integration:Integration" &&
                    r.id === target
                );
                const fn = checkpoint.resources.find(
                  (r: any) =>
                    r.type === "aws:lambda/function:Function" &&
                    r.outputs.urn === integration?.outputs?.arn
                );

                return [
                  {
                    type: "function",
                    fn: {
                      node: fn.parent,
                      stack: stackID,
                    },
                    route: route.outputs?.routeKey,
                  },
                ];
              }),
              graphql: false,
              httpApiId: "",
              customDomainUrl: "",
            },
          });
        }

        if (res.type === "sst:aws:Bucket") {
          const child = checkpoint.resources.find(
            (child: any) =>
              child.parent === res.urn &&
              child.type === "aws:s3/bucketV2:BucketV2"
          );
          if (!child) continue;
          resources.push({
            ...base,
            type: "Bucket",
            data: {
              name: child.outputs?.bucket,
              notifications: [],
              notificationNames: [],
            },
            enrichment: {},
          });
        }

        if (res.type === "sst:aws:Cron") {
          const fn = checkpoint.resources.find(
            (child: any) =>
              child.parent === res.urn && child.type === "sst:aws:Function"
          );
          if (!fn) continue;
          const rule = checkpoint.resources.find(
            (child: any) =>
              child.parent === res.urn &&
              child.type === "aws:cloudwatch/eventRule:EventRule"
          );

          resources.push({
            ...base,
            type: "Cron",
            data: {
              job: {
                node: fn.urn,
                stack: stackID,
              },
              schedule: rule.outputs?.scheduleExpression,
              ruleName: rule.outputs?.name,
            },
            enrichment: {},
          });
        }

        if (res.type === "sst:aws:Nextjs") {
          resources.push({
            ...base,
            type: "NextjsSite",
            enrichment: {},
            data: {
              url: res.outputs?._metadata.url,
              edge: res.outputs?._metadata.edge,
              mode: res.outputs?._metadata.mode,
              path: res.outputs?._metadata.path,
              server: res.outputs?._metadata.server,
              routes: undefined,
              runtime: "nodejs20.x",
              prefetchSecrets: true,
              secrets: [],
              customDomainUrl: res.outputs?._metadata?.url,
            },
          });
        }
        if (res.type === "sst:aws:Astro") {
          resources.push({
            ...base,
            type: "AstroSite",
            enrichment: {},
            data: {
              url: res.outputs?._metadata.url,
              edge: res.outputs?._metadata.edge,
              mode: res.outputs?._metadata.mode,
              path: res.outputs?._metadata.path,
              server: res.outputs?._metadata.server,
              runtime: "nodejs20.x",
              prefetchSecrets: true,
              secrets: [],
              customDomainUrl: res.outputs?._metadata?.url,
            },
          });
        }
        if (res.type === "sst:aws:Remix") {
          resources.push({
            ...base,
            type: "RemixSite",
            enrichment: {},
            data: {
              url: res.outputs?._metadata.url,
              edge: res.outputs?._metadata.edge,
              mode: res.outputs?._metadata.mode,
              path: res.outputs?._metadata.path,
              server: res.outputs?._metadata.server,
              runtime: "nodejs20.x",
              prefetchSecrets: true,
              secrets: [],
              customDomainUrl: res.outputs?._metadata?.url,
            },
          });
        }
      }
      missing = false;
    }
  }
  s3.destroy();
  console.log("resources", JSON.stringify(resources, null, 4));

  return createTransaction(async (tx) => {
    if (missing) {
      await remove(input.stageID);
      return;
    }
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

function parseVersion(input: string) {
  return input
    .split(".")
    .map((item) => parseInt(item))
    .reduce((acc, val, i) => acc + val * Math.pow(1000, 2 - i), 0);
}
const MINIMUM_VERSION = parseVersion("2.19.2");
