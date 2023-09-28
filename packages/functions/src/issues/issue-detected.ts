import { useWorkspace, withActor } from "@console/core/actor";
import { app, stage } from "@console/core/app/app.sql";
import { and, db, eq, gt, lt, sql } from "@console/core/drizzle";
import { Issue } from "@console/core/issue";
import { issue, issueAlert } from "@console/core/issue/issue.sql";
import { Slack } from "@console/core/slack";
import { slackTeam } from "@console/core/slack/slack.sql";
import { createId } from "@console/core/util/sql";
import { workspace } from "@console/core/workspace/workspace.sql";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(Issue.Events.IssueDetected, async (event) =>
  withActor(event.metadata.actor, async () => {
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
      .innerJoin(stage, eq(stage.id, issue.stageID))
      .innerJoin(app, eq(app.id, stage.appID))
      .where(
        and(
          eq(issue.workspaceID, useWorkspace()),
          eq(issue.stageID, event.properties.stageID),
          eq(issue.group, event.properties.group),
        ),
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

    const limit = await db
      .select({ id: issueAlert.id })
      .from(issueAlert)
      .where(
        and(
          eq(issueAlert.workspaceID, useWorkspace()),
          eq(issueAlert.stageID, event.properties.stageID),
          eq(issueAlert.group, event.properties.group),
          gt(issueAlert.timeUpdated, sql`NOW() - INTERVAL 30 MINUTE`),
        ),
      );

    if (limit.length > 0) return;

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
        stageID: event.properties.stageID,
        group: event.properties.group,
      })
      .onDuplicateKeyUpdate({
        set: {
          timeUpdated: sql`NOW()`,
        },
      });
  }),
);
