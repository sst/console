import { createId } from "@paralleldrive/cuid2";
import { eq, and, isNull, gt, sql } from "drizzle-orm";
import { useWorkspace } from "../actor";
import { app, stage } from "../app/app.sql";
import { db } from "../drizzle";
import { event } from "../event";
import { Slack } from "../slack";
import { slackTeam } from "../slack/slack.sql";
import { workspace } from "../workspace/workspace.sql";
import { issue, issueAlert } from "./issue.sql";
import { createSelectSchema } from "drizzle-zod";
import { zod } from "../util/zod";

export * as Alert from "./alert";

export const Limit = createSelectSchema(issueAlert);

export const trigger = zod(
  Limit.pick({ stageID: true, group: true }),
  async (input) => {
    const result = await db
      .select({
        id: issue.id,
        error: issue.error,
        message: issue.message,
        stack: issue.stack,
        slug: workspace.slug,
        appName: app.name,
        stageName: stage.name,
      })
      .from(issue)
      .innerJoin(workspace, eq(workspace.id, issue.workspaceID))
      .innerJoin(
        stage,
        and(eq(stage.id, issue.stageID), eq(stage.workspaceID, useWorkspace()))
      )
      .innerJoin(
        app,
        and(eq(app.id, stage.appID), eq(app.workspaceID, useWorkspace()))
      )
      .innerJoin(
        issueAlert,
        and(
          eq(issueAlert.workspaceID, useWorkspace()),
          eq(issueAlert.stageID, issue.stageID),
          eq(issueAlert.group, issue.group)
        )
      )
      .where(
        and(
          eq(issue.workspaceID, useWorkspace()),
          eq(issue.stageID, input.stageID),
          eq(issue.group, input.group),
          gt(issueAlert.timeUpdated, sql`NOW() - INTERVAL 30 MINUTE`),
          isNull(issue.timeIgnored)
        )
      )
      .then((rows) => rows[0]);

    if (!result) return;

    // temporary
    const row = await db
      .select({ team: slackTeam.teamID })
      .from(slackTeam)
      .where(eq(slackTeam.workspaceID, useWorkspace()))
      .limit(1)
      .execute()
      .then((rows) => rows.at(0));
    if (!row) return;

    const withContext = result.stack?.filter((frame) => frame.context) || [];
    const code =
      withContext.find((frame) => frame.important)?.context ||
      withContext[0]?.context;

    await Slack.send({
      channel: "alerts-sst",
      teamID: row.team,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: [
              `*<https://console.sst.dev/${result.slug}/${result.appName}/${result.stageName}/issues/${result.id} | ${result.error}>*`,
              result.message,
            ].join("\n"),
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "plain_text",
              text: [result.appName, result.stageName].join("/"),
            },
          ],
        },
      ],
    });

    await db
      .insert(issueAlert)
      .values({
        id: createId(),
        workspaceID: useWorkspace(),
        stageID: input.stageID,
        group: input.group,
      })
      .onDuplicateKeyUpdate({
        set: {
          timeUpdated: sql`NOW()`,
        },
      });
  }
);
