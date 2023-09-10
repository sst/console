import { z } from "zod";
import { zod } from "../util/zod";

export { Account } from "./account";
import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";
import { useWorkspace } from "../actor";
import { useTransaction } from "../util/transaction";
import { awsAccount } from "./aws.sql";
import { and, eq, sql } from "drizzle-orm";

export * as AWS from ".";

const sts = new STSClient({});

export const assumeRole = zod(z.string(), async (id) => {
  const workspaceID = useWorkspace();
  try {
    const result = await sts.send(
      new AssumeRoleCommand({
        RoleArn: `arn:aws:iam::${id}:role/sst-${workspaceID}`,
        RoleSessionName: "sst",
        ExternalId: workspaceID,
        DurationSeconds: 900,
      })
    );
    await useTransaction((tx) =>
      tx
        .update(awsAccount)
        .set({
          timeFailed: null,
        })
        .where(
          and(
            eq(awsAccount.accountID, id),
            eq(awsAccount.workspaceID, workspaceID)
          )
        )
        .execute()
    );
    return {
      secretAccessKey: result.Credentials!.SecretAccessKey!,
      accessKeyId: result.Credentials!.AccessKeyId!,
      sessionToken: result.Credentials!.SessionToken!,
    };
  } catch (e: any) {
    console.error(e);
    await useTransaction((tx) =>
      tx
        .update(awsAccount)
        .set({
          timeFailed: sql`now()`,
        })
        .where(
          and(
            eq(awsAccount.accountID, id),
            eq(awsAccount.workspaceID, workspaceID)
          )
        )
        .execute()
    );
    console.log("failed to assume role for account", id);
    return;
  }
});

export type Credentials = Exclude<
  Awaited<ReturnType<typeof assumeRole>>,
  undefined
>;
