import { useWorkspace, withActor } from "@console/core/actor";
import { app, stage } from "@console/core/app/app.sql";
import { and, db, eq } from "@console/core/drizzle";
import { Issue } from "@console/core/issue";
import { issue } from "@console/core/issue/issue.sql";
import { Slack } from "@console/core/slack";
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
    const withContext = result.stack?.filter((frame) => frame.context) || [];
    const code =
      withContext.find((frame) => frame.important)?.context ||
      withContext[0]?.context;

    await Slack.send({
      channel: "team",
      teamID: "T01JJ7B6URX",
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
      ],
    });
  }),
);
