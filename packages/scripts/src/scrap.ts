import { createHash } from "crypto";
import { stage } from "@console/core/app/app.sql";
import { awsAccount } from "@console/core/aws/aws.sql";
import { and, db, eq } from "@console/core/drizzle";
import { issue } from "@console/core/issue/issue.sql";
import { queue } from "@console/core/util/queue";

const BATCH = 1000;
let offset = 0;

let completed = 0;
while (true) {
  const issues = await db
    .select({
      id: issue.id,
      workspaceID: issue.workspaceID,
      stack: issue.stack,
      error: issue.error,
      group: issue.group,
      pointer: issue.pointer,
      region: stage.region,
      accountID: awsAccount.accountID,
    })
    .from(issue)
    .innerJoin(
      stage,
      and(eq(issue.stageID, stage.id), eq(issue.workspaceID, stage.workspaceID))
    )
    .innerJoin(awsAccount, eq(awsAccount.id, stage.awsAccountID))
    .offset(offset)
    .limit(BATCH);
  if (issues.length === 0) break;

  await queue(100, issues, async (item) => {
    const sourcemapKey =
      `arn:aws:lambda:${item.region}:${item.accountID}:function:` +
      item.pointer?.logGroup.split("/").slice(3, 5).join("/");
    const err = {
      stack: item.stack || [],
      error: item.error,
    };
    const groupParts = (() => {
      const [important] = err.stack.filter((x) => x.important);

      if (err.error === "LambdaTimeoutError") {
        return [err.error, sourcemapKey];
      }

      if (important) {
        return [err.error, important.context?.[3]?.trim(), important.file];
      }

      const frames = err.stack
        .map((x) => {
          if (x.file) {
            return x.context?.[3] || x.file;
          }

          return x.raw!;
        })
        .map((x) => x.trim());
      return [err.error, frames[0]];
    })();

    const group = createHash("sha256")
      .update(groupParts.filter(Boolean).join("\n"))
      .digest("hex");

    console.log({
      old: item.group,
      next: group,
    });

    if (item.group !== group) {
      await db
        .update(issue)
        .set({ group })
        .where(
          and(eq(issue.id, item.id), eq(issue.workspaceID, item.workspaceID))
        )
        .catch(async (err) => {
          if (err.name === "DatabaseError") {
            if (JSON.stringify(err.body.message.includes("AlreadyExists")))
              await db
                .delete(issue)
                .where(
                  and(
                    eq(issue.id, item.id),
                    eq(issue.workspaceID, item.workspaceID)
                  )
                );
          }
        });
    }
    console.log("completed", ++completed);
  });

  offset += BATCH;
}
