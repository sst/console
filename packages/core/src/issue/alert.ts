import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { createId } from "@paralleldrive/cuid2";
import { eq, and, isNull, gt, sql, getTableColumns, or } from "drizzle-orm";
import { useWorkspace } from "../actor";
import { app, stage } from "../app/app.sql";
import { db } from "../drizzle";
import { Slack } from "../slack";
import { workspace } from "../workspace/workspace.sql";
import { issue, issueAlert, issueAlertLimit } from "./issue.sql";
import { createSelectSchema } from "drizzle-zod";
import { zod } from "../util/zod";
import { useTransaction } from "../util/transaction";
import { User } from "../user";
import { z } from "zod";
import { IssueEmail } from "@console/mail/emails/templates/IssueEmail";
import { render } from "@jsx-email/render";

export * as Alert from "./alert";

export const Limit = createSelectSchema(issueAlertLimit);

export const Info = createSelectSchema(issueAlert);

const ses = new SESv2Client({});

export interface Source {
  app: "*" | string[];
  stage: "*" | string[];
}

export type Destination = SlackDestination | EmailDestination;

export interface SlackDestination {
  type: "slack";
  properties: {
    team: string;
    channel: string;
  };
}

export interface EmailDestination {
  type: "email";
  properties: {
    to: string[];
  };
}

export const create = zod(
  Info.pick({ id: true }).partial({ id: true }),
  (input) =>
    useTransaction(async (tx) => {
      const users = await User.list();
      const id = input.id ?? createId();
      await tx.insert(issueAlert).values({
        id,
        workspaceID: useWorkspace(),
        source: {
          stage: "*",
          app: "*",
        },
        destination: {
          type: "email",
          properties: {
            to: users.map((user) => user.email),
          },
        },
      });
      return id;
    })
);

export const trigger = zod(
  z.object({
    stageID: z.string().cuid2(),
    group: z.string(),
  }),
  async (input) => {
    const result = await db
      .select({
        ...getTableColumns(issue),
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
      .leftJoin(
        issueAlertLimit,
        and(
          eq(issueAlertLimit.workspaceID, useWorkspace()),
          eq(issueAlertLimit.issueID, issue.id)
        )
      )
      .where(
        and(
          eq(issue.workspaceID, useWorkspace()),
          eq(issue.stageID, input.stageID),
          eq(issue.group, input.group),
          or(
            isNull(issueAlertLimit.timeUpdated),
            gt(issueAlertLimit.timeUpdated, sql`NOW() - INTERVAL 30 MINUTE`)
          ),
          isNull(issue.timeIgnored)
        )
      )
      .then((rows) => rows[0]);

    if (!result) return;

    const alerts = await db
      .select()
      .from(issueAlert)
      .where(eq(issueAlert.workspaceID, useWorkspace()));

    for (const alert of alerts) {
      const { source, destination } = alert;
      const match =
        (source.app === "*" || source.app.includes(result.appName)) &&
        (source.stage === "*" || source.stage.includes(result.stageName));
      if (!match) continue;

      if (destination.type === "slack") {
        await Slack.send({
          channel: "alerts-sst",
          teamName: destination.properties.team,
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
      }

      if (destination.type === "email") {
        const html = render(
          IssueEmail({
            issue: result,
            stage: result.stageName,
            app: result.appName,
            url: "https://console.sst.dev",
            assetsUrl: "https://console.sst.dev/email/",
            workspace: "",
            settingsUrl: "https://console.sst.dev",
          })
        );
        console.log(html);
        const response = await ses.send(
          new SendEmailCommand({
            Destination: {
              ToAddresses: ["dax@sst.dev"],
            },
            ReplyToAddresses: [
              result.id + "+issue+alerts@" + process.env.EMAIL_DOMAIN,
            ],
            FromEmailAddress: `SST <${result.id}+issue+alerts@${process.env.EMAIL_DOMAIN}>`,
            Content: {
              Simple: {
                Body: {
                  Html: {
                    Data: html,
                  },
                  Text: {
                    Data: result.message,
                  },
                },
                Subject: {
                  Data: `Error ${result.error}`,
                },
              },
            },
          })
        );
        console.log(response);
      }
    }

    await db
      .insert(issueAlertLimit)
      .values({
        id: createId(),
        workspaceID: useWorkspace(),
        issueID: result.id,
      })
      .onDuplicateKeyUpdate({
        set: {
          timeUpdated: sql`NOW()`,
        },
      });
  }
);
