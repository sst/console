export * as Account from "./account";

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { zod } from "../util/zod";
import { createId } from "@paralleldrive/cuid2";
import { createTransactionEffect, useTransaction } from "../util/transaction";
import { awsAccount } from "./aws.sql";
import { useWorkspace } from "../actor";
import { and, eq } from "drizzle-orm";
import { assumeRole } from ".";
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
} from "@aws-sdk/client-s3";
import {
  CreateRoleCommand,
  DeletePolicyCommand,
  DeleteRoleCommand,
  IAMClient,
  PutRolePolicyCommand,
} from "@aws-sdk/client-iam";
import { event } from "../event";

export const Info = createSelectSchema(awsAccount, {
  id: (schema) => schema.id.cuid2(),
  accountID: (schema) => schema.accountID.regex(/^[0-9]{12}$/),
});
export type Info = z.infer<typeof Info>;

export const Events = {
  Created: event("aws.account.created", {
    awsAccountID: z.string(),
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
    credentials: z.custom<Awaited<ReturnType<typeof assumeRole>>>(),
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
      .then((x) => x?.Stacks?.[0]);
    if (!bootstrap) {
      throw new Error("Bootstrap stack not found");
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

export const integrate = zod(bootstrap.schema, async (input) => {
  return;
  const { bucket } = await bootstrap(input);

  const s3 = new S3Client(input);
  const eb = new EventBridgeClient(input);
  const iam = new IAMClient(input);

  await s3.send(
    new PutBucketNotificationConfigurationCommand({
      Bucket: bucket,
      NotificationConfiguration: {
        EventBridgeConfiguration: {},
      },
    })
  );

  const rule = await eb.send(
    new PutRuleCommand({
      Name: "SSTConsole",
      State: "ENABLED",
      EventPattern: JSON.stringify({
        source: [
          {
            prefix: "",
          },
        ],
      }),
    })
  );
  console.log("created eventbus rule");

  await iam.send(
    new DeletePolicyCommand({
      PolicyArn: "eventbus",
    })
  );
  await iam.send(
    new DeleteRoleCommand({
      RoleName: "SSTConsolePublisher",
    })
  );
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
  console.log("created publisher role");

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
  console.log("enabled s3 notification");
});
