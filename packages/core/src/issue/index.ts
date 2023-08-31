import { createHash } from "crypto";
import { provideActor } from "../actor";
import { AWS } from "../aws";
import { awsAccount } from "../aws/aws.sql";
import { and, db, eq, sql } from "../drizzle";
import { Log } from "../log";
import { app, stage } from "../app/app.sql";
import { issue } from "./issue.sql";
import { createId } from "@paralleldrive/cuid2";

export * as Issue from "./index";

export async function process(input: {
  logGroup: string;
  logStream: string;
  subscriptionFilters: string[];
  logEvents: {
    id: string;
    timestamp: number;
    message: string;
  }[];
}) {
  const { logGroup, logStream } = input;
  const [filter] = input.subscriptionFilters;
  if (!filter) return;
  const [_prefix, region, accountID, appName, stageName] = filter.split("#");

  const workspaces = await db
    .select({
      accountID: awsAccount.id,
      workspaceID: awsAccount.workspaceID,
      appID: app.id,
      stageID: stage.id,
    })
    .from(awsAccount)
    .leftJoin(
      app,
      and(eq(app.workspaceID, awsAccount.workspaceID), eq(app.name, appName!))
    )
    .innerJoin(
      stage,
      and(
        eq(stage.workspaceID, app.workspaceID),
        eq(stage.appID, app.id),
        eq(stage.name, stageName!)
      )
    )
    .where(eq(awsAccount.accountID, accountID!))
    .execute();

  provideActor({
    type: "system",
    properties: {
      workspaceID: workspaces[0]!.workspaceID,
    },
  });
  const credentials = await AWS.assumeRole(accountID!);
  if (!credentials) return;

  const functionArn =
    `arn:aws:lambda:${region}:${accountID}:function:` +
    input.logGroup.split("/").pop();

  for (const event of input.logEvents) {
    const logs = await Log.expand({
      functionArn,
      logStream,
      logGroup,
      timestamp: event.timestamp,
      region: region!,
      credentials: credentials!,
    });

    for (const err of logs) {
      if (err.type !== "error") continue;
      const group = createHash("sha256")
        .update(
          [
            err.error,
            err.message,
            err.stack[0]?.file,
            err.stack[0]?.context?.[0] || err.stack[0]?.raw,
          ]
            .filter(Boolean)
            .join("\n")
        )
        .digest("hex");

      await db
        .insert(issue)
        .values(
          workspaces.map((row) => ({
            group,
            id: createId(),
            errorID: err.id,
            workspaceID: row.workspaceID,
            error: err.error,
            message: err.message,
            stageID: row.stageID,
          }))
        )
        .onDuplicateKeyUpdate({
          set: {
            error: sql`VALUES(error)`,
            errorID: sql`VALUES(error_id)`,
            message: sql`VALUES(message)`,
          },
        })
        .execute();
    }
  }
}
