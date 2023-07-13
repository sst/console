export * as Account from "./account";

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { zod } from "../util/zod";
import { createId } from "@paralleldrive/cuid2";
import { createTransactionEffect, useTransaction } from "../util/transaction";
import { awsAccount } from "./aws.sql";
import { useWorkspace } from "../actor";
import { and, eq } from "drizzle-orm";
import { Credentials, assumeRole } from ".";
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
      await tx.insert(awsAccount).values({
        id,
        workspaceID: useWorkspace(),
        accountID: input.accountID,
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
      .then((x) => x?.Stacks?.[0])
      .catch(() => {});
    if (!bootstrap) {
      return;
    }

    const bucket = bootstrap.Outputs?.find(
      (x) => x.OutputKey === "BucketName"
    )?.OutputValue;

    if (!bucket) throw new Error("BucketName not found");

    return {
      bucket,
    };
  }
);

import { DescribeRegionsCommand, EC2Client } from "@aws-sdk/client-ec2";
import { App } from "../app";
import { Realtime } from "../realtime";
import { Replicache } from "../replicache";

export const regions = zod(
  bootstrap.schema.shape.credentials,
  async (credentials) => {
    const client = new EC2Client({
      credentials,
    });
    const regions = await client
      .send(new DescribeRegionsCommand({}))
      .then((r) => r.Regions || []);
    return regions;
  }
);

export const integrate = zod(Info.shape.id, async (id) => {
  const account = await fromID(id);
  if (!account) return;
  const credentials = await assumeRole(account.accountID);
  await Promise.all(
    (
      await regions(credentials)
    ).map(async (region) => {
      const config = {
        credentials,
        region: region.RegionName!,
      };
      console.log("integrating region", region);

      const b = await bootstrap(config);
      if (!b) return;

      const s3 = new S3Client(config);
      const eb = new EventBridgeClient(config);
      const iam = new IAMClient(config);

      console.log("found sst bucket", b.bucket);

      await s3.send(
        new PutBucketNotificationConfigurationCommand({
          Bucket: b.bucket,
          NotificationConfiguration: {
            EventBridgeConfiguration: {},
          },
        })
      );
      console.log("enabled s3 notification");

      await iam
        .send(
          new DeleteRolePolicyCommand({
            RoleName: "SSTConsolePublisher",
            PolicyName: "eventbus",
          })
        )
        .catch(() => {});
      await iam
        .send(
          new DeleteRoleCommand({
            RoleName: "SSTConsolePublisher",
          })
        )
        .catch(() => {});
      const role = await iam.send(
        new CreateRoleCommand({
          RoleName: "SSTConsolePublisher",
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
      console.log(process.env.EVENT_BUS_ARN);
      await iam.send(
        new PutRolePolicyCommand({
          RoleName: role.Role!.RoleName,
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
      console.log("created publisher role");

      await eb.send(
        new PutRuleCommand({
          Name: "SSTConsole",
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
          Rule: "SSTConsole",
          Targets: [
            {
              Arn: process.env.EVENT_BUS_ARN,
              Id: "SSTConsole",
              RoleArn: role.Role!.Arn,
            },
          ],
        })
      );
      console.log("created eventbus rule");

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
            }).then((s) => s?.id);
            if (!stage)
              stage = await App.Stage.connect({
                name: stageName,
                appID: app,
                region: config.region,
                awsAccountID: account.id,
              });
          });
          console.log("found", stageName, appName);
        }
        if (!list.ContinuationToken) break;
      }

      await Replicache.poke();
    })
  );
  return;
});
