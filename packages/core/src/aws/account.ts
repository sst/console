export * as Account from "./account";

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { zod } from "../util/zod";
import { createId } from "@paralleldrive/cuid2";
import { createTransactionEffect, useTransaction } from "../util/transaction";
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
  async (input) =>
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
      createTransactionEffect(() =>
        Events.Created.publish({
          awsAccountID: id,
        })
      );
      return id;
    })
);

export const fromID = zod(Info.shape.id, async (accountID) =>
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

export const fromAccountID = zod(Info.shape.accountID, async (accountID) =>
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
      .catch(() => {
        console.log(input.region, "no bootstrap stack found");
      });
    if (!bootstrap) {
      return;
    }

    const bucket = bootstrap.Stacks?.at(0)?.Outputs?.find(
      (x) => x.OutputKey === "BucketName"
    )?.OutputValue;

    if (!bucket) {
      console.log(input.region, "no bucket found");
      return;
    }

    return {
      bucket,
    };
  }
);

import { DescribeRegionsCommand, EC2Client } from "@aws-sdk/client-ec2";
import { App } from "../app";
import { Replicache } from "../replicache";
import { Config } from "sst/node/config";
import { db } from "../drizzle";
import { Realtime } from "../realtime";

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
      .catch((err) => {});
    console.log("deleted role policy");
    await iam
      .send(
        new DeleteRoleCommand({
          RoleName: roleName,
        })
      )
      .catch((err) => {});
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

    await Promise.all(
      r.map(async (region) => {
        const config = {
          credentials: input.credentials,
          region: region!,
        };
        console.log("integrating region", region);

        const b = await bootstrap(config);
        if (!b) return;

        const s3 = new S3Client(config);
        const eb = new EventBridgeClient(config);

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
          .catch(() => {});
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
        while (true) {
          const list = await s3.send(
            new ListObjectsV2Command({
              Prefix: "appMetadata",
              Bucket: b.bucket,
              ContinuationToken: token,
            })
          );

          for (const item of list.Contents || []) {
            const [, appHint, stageHint] = item.Key?.split("/") || [];
            if (!appHint || !stageHint) return;
            const [, stageName] = stageHint?.split(".");
            const [, appName] = appHint?.split(".");
            if (!stageName || !appName) return;
            await useTransaction(async () => {
              let app = await App.fromName(appName).then((a) => a?.id);
              if (!app)
                app = await App.create({
                  name: appName,
                });

              let stage = await App.Stage.fromName({
                appID: app,
                name: stageName,
                region,
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
          if (!list.ContinuationToken) break;
        }
      })
    );

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
);
