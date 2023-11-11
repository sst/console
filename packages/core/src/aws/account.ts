export * as Account from "./account";

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { zod } from "../util/zod";
import { createId } from "@paralleldrive/cuid2";
import {
  createTransaction,
  createTransactionEffect,
  useTransaction,
} from "../util/transaction";
import { awsAccount } from "./aws.sql";
import { useWorkspace } from "../actor";
import { and, eq, sql } from "drizzle-orm";
import { Credentials } from ".";
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";
import {
  EventBridgeClient,
  PutRuleCommand,
  PutTargetsCommand,
} from "@aws-sdk/client-eventbridge";
import {
  S3Client,
  PutBucketNotificationConfigurationCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import {
  CreateRoleCommand,
  DeleteRoleCommand,
  DeleteRolePolicyCommand,
  IAMClient,
  PutRolePolicyCommand,
} from "@aws-sdk/client-iam";
import { event } from "../event";

export const Info = createSelectSchema(awsAccount, {
  id: (schema) => schema.id.cuid2(),
  accountID: (schema) => schema.accountID.regex(/^[0-9]{12}$/),
  workspaceID: (schema) => schema.workspaceID.cuid2(),
});
export type Info = z.infer<typeof Info>;

export const Events = {
  Created: event("aws.account.created", {
    awsAccountID: z.string().cuid2(),
  }),
};

export const create = zod(
  Info.pick({ id: true, accountID: true }).partial({
    id: true,
  }),
  (input) =>
    useTransaction(async (tx) => {
      const id = input.id ?? createId();
      await tx
        .insert(awsAccount)
        .values({
          id,
          workspaceID: useWorkspace(),
          accountID: input.accountID,
        })
        .onDuplicateKeyUpdate({
          set: {
            timeFailed: null,
          },
        });
      await createTransactionEffect(() =>
        Events.Created.publish({
          awsAccountID: id,
        })
      );
      return id;
    })
);

export const scan = zod(Info.shape.id, (input) =>
  useTransaction(async (tx) => {
    await tx
      .update(awsAccount)
      .set({
        timeDiscovered: null,
      })
      .where(
        and(
          eq(awsAccount.id, input),
          eq(awsAccount.workspaceID, useWorkspace())
        )
      );
    await createTransactionEffect(() =>
      Events.Created.publish({
        awsAccountID: input,
      })
    );
  })
);

export const fromID = zod(Info.shape.id, (accountID) =>
  useTransaction((tx) =>
    tx
      .select()
      .from(awsAccount)
      .where(
        and(
          eq(awsAccount.id, accountID),
          eq(awsAccount.workspaceID, useWorkspace())
        )
      )
      .execute()
      .then((rows) => rows[0])
  )
);

export const fromAccountID = zod(Info.shape.accountID, (accountID) =>
  useTransaction((tx) =>
    tx
      .select()
      .from(awsAccount)
      .where(
        and(
          eq(awsAccount.accountID, accountID),
          eq(awsAccount.workspaceID, useWorkspace())
        )
      )
      .execute()
      .then((rows) => rows[0])
  )
);

export const bootstrap = zod(
  z.object({
    credentials: z.custom<Credentials>(),
    region: z.string(),
  }),
  async (input) => {
    const cf = new CloudFormationClient(input);

    const bootstrap = await cf
      .send(
        new DescribeStacksCommand({
          StackName: "SSTBootstrap",
        })
      )
      .catch(() => {});

    if (bootstrap) {
      const bucket = bootstrap.Stacks?.at(0)?.Outputs?.find(
        (x) => x.OutputKey === "BucketName"
      )?.OutputValue;

      if (!bucket) {
        console.log(
          useWorkspace(),
          input.region,
          bootstrap.Stacks?.at(0),
          "no bucket found"
        );
        return;
      }

      return {
        bucket,
      };
    }

    // try to find stack if it's named something different
    /*
    let paging: string | undefined;
    while (true) {
      const all = await cf.send(new DescribeStacksCommand({}));
      paging = all.NextToken;

      const [bucket] = (all.Stacks || []).map(
        (s) => s.Outputs?.find((o) => o.OutputKey === "BucketName")?.OutputValue
      );
      if (bucket) return { bucket };
      if (!paging) break;
    }
    */
  }
);

import { DescribeRegionsCommand, EC2Client } from "@aws-sdk/client-ec2";
import { App, Stage } from "../app";
import { Replicache } from "../replicache";
import { Config } from "sst/node/config";
import { db } from "../drizzle";
import { Realtime } from "../realtime";
import { app, stage } from "../app/app.sql";
import { createPipe, groupBy, mapValues, pipe } from "remeda";
import { RETRY_STRATEGY } from "../util/aws";

export const regions = zod(
  bootstrap.schema.shape.credentials,
  async (credentials) => {
    const client = new EC2Client({
      credentials,
    });
    const regions = await client
      .send(new DescribeRegionsCommand({}))
      .then((r) => r.Regions || []);
    return [...new Set(regions.map((r) => r.RegionName!))];
  }
);

export const integrate = zod(
  z.object({
    awsAccountID: Info.shape.id,
    credentials: z.custom<Credentials>(),
  }),
  async (input) => {
    const account = await fromID(input.awsAccountID);
    await db
      .update(awsAccount)
      .set({
        timeDiscovered: null,
      })
      .where(
        and(
          eq(awsAccount.id, input.awsAccountID),
          eq(awsAccount.workspaceID, useWorkspace())
        )
      )
      .execute();
    await Replicache.poke();
    console.log("integrating account", account);
    if (!account) return;
    const iam = new IAMClient({
      credentials: input.credentials,
    });
    const suffix = Config.STAGE !== "production" ? "-" + Config.STAGE : "";
    const roleName = "SSTConsolePublisher" + suffix;
    await iam
      .send(
        new DeleteRolePolicyCommand({
          RoleName: roleName,
          PolicyName: "eventbus",
        })
      )
      .catch((err) => {
        console.error(err);
      });
    console.log("deleted role policy");
    await iam
      .send(
        new DeleteRoleCommand({
          RoleName: roleName,
        })
      )
      .catch((err) => {
        console.error(err);
      });
    console.log("deleted role");

    const role = await iam.send(
      new CreateRoleCommand({
        RoleName: roleName,
        AssumeRolePolicyDocument: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                Service: "events.amazonaws.com",
              },
              Action: "sts:AssumeRole",
            },
          ],
        }),
      })
    );
    console.log("created role");

    await iam.send(
      new PutRolePolicyCommand({
        RoleName: roleName,
        PolicyName: "eventbus",
        PolicyDocument: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: ["events:PutEvents"],
              Resource: [process.env.EVENT_BUS_ARN],
            },
          ],
        }),
      })
    );
    console.log("created role policy");

    const r = await regions(input.credentials);
    console.log("regions", r);

    try {
      await Promise.all(
        r.map(async (region) => {
          const config = {
            credentials: input.credentials,
            region: region!,
          };
          console.log("integrating region", region);

          const b = await bootstrap(config);
          if (!b) return;

          const s3 = new S3Client({
            ...config,
            retryStrategy: RETRY_STRATEGY,
          });
          const eb = new EventBridgeClient({
            ...config,
            retryStrategy: RETRY_STRATEGY,
          });

          console.log(region, "found sst bucket", b.bucket);

          const result = await s3
            .send(
              new PutBucketNotificationConfigurationCommand({
                Bucket: b.bucket,
                NotificationConfiguration: {
                  EventBridgeConfiguration: {},
                },
              })
            )
            .catch((err) => {
              console.error(err);
            });
          if (!result) {
            console.log(region, "failed to update bucket notification");
            return;
          }
          console.log(region, "updated bucket notifications");

          await eb.send(
            new PutRuleCommand({
              Name: "SSTConsole" + suffix,
              State: "ENABLED",
              EventPattern: JSON.stringify({
                source: ["aws.s3"],
                detail: {
                  bucket: {
                    name: [b.bucket],
                  },
                },
              }),
            })
          );
          await eb.send(
            new PutTargetsCommand({
              Rule: "SSTConsole" + suffix,
              Targets: [
                {
                  Arn: process.env.EVENT_BUS_ARN,
                  Id: "SSTConsole",
                  RoleArn: role.Role!.Arn,
                },
              ],
            })
          );
          console.log(region, "created eventbus rule");

          let token: string | undefined;
          const existing = await useTransaction((tx) =>
            tx
              .select({
                stageName: stage.name,
                stageID: stage.id,
                appName: app.name,
              })
              .from(stage)
              .innerJoin(app, eq(stage.appID, app.id))
              .where(
                and(
                  eq(stage.awsAccountID, account.id),
                  eq(stage.region, region),
                  eq(stage.workspaceID, useWorkspace())
                )
              )
          ).then(
            createPipe(
              groupBy((r) => r.appName),
              mapValues((rows) =>
                rows.map((r) => [r.stageName, r.stageID] as const)
              ),
              mapValues((rows) => new Map(rows))
            )
          );
          while (true) {
            const list = await s3.send(
              new ListObjectsV2Command({
                Prefix: "stackMetadata",
                Bucket: b.bucket,
                ContinuationToken: token,
              })
            );
            const distinct = new Set(
              list.Contents?.filter((item) => item.Key).map((item) =>
                item.Key!.split("/").slice(0, 3).join("/")
              ) || []
            );

            console.log("found", distinct);
            for (const item of distinct) {
              const [, appHint, stageHint] = item.split("/") || [];
              if (!appHint || !stageHint) continue;
              const [, stageName] = stageHint?.split(".");
              const [, appName] = appHint?.split(".");
              if (!stageName || !appName) continue;
              existing[appName]?.delete(stageName);
              await createTransaction(async () => {
                let app = await App.fromName(appName).then((a) => a?.id);
                if (!app)
                  app = await App.create({
                    name: appName,
                  });

                let stage = await App.Stage.fromName({
                  appID: app,
                  name: stageName,
                  region,
                  awsAccountID: input.awsAccountID,
                }).then((s) => s?.id);
                if (!stage) {
                  stage = await App.Stage.connect({
                    name: stageName,
                    appID: app,
                    region: config.region,
                    awsAccountID: account.id,
                  });
                  await Replicache.poke();
                }
              });
              console.log(region, "found", stageName, appName);
            }

            for (const [appName, stages] of Object.entries(existing)) {
              for (const [stageName, stageID] of stages) {
                console.log("could not find", appName, stageName, stageID);
                await App.Stage.remove(stageID);
              }
            }
            if (!list.ContinuationToken) break;
          }
        })
      );
    } finally {
      await db
        .update(awsAccount)
        .set({
          timeDiscovered: sql`CURRENT_TIMESTAMP()`,
        })
        .where(
          and(
            eq(awsAccount.id, input.awsAccountID),
            eq(awsAccount.workspaceID, useWorkspace())
          )
        );
    }
  }
);
