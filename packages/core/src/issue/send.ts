import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import {
  eq,
  and,
  isNotNull,
  isNull,
  gt,
  sql,
  getTableColumns,
  or,
  lt,
  inArray,
} from "drizzle-orm";
import { useWorkspace } from "../actor";
import { app, stage } from "../app/app.sql";
import { db } from "../drizzle";
import { Slack } from "../slack";
import { workspace } from "../workspace/workspace.sql";
import { issue, issueAlertLimit } from "./issue.sql";
import { createSelectSchema } from "drizzle-zod";
import { zod } from "../util/zod";
import { z } from "zod";
import { IssueEmail } from "@console/mail/emails/templates/IssueEmail";
import { IssueRateLimitEmail } from "@console/mail/emails/templates/IssueRateLimitEmail";
import { render } from "@jsx-email/render";
import { user } from "../user/user.sql";
import { KnownBlock } from "@slack/web-api";
import { Warning } from "../warning";
import { Workspace } from "../workspace";
import { Alert } from "../alert";
import { alert } from "../alert/alert.sql";

const ses = new SESv2Client({});

export const Limit = createSelectSchema(issueAlertLimit);

export const triggerIssue = zod(
  z.object({
    stageID: z.string().cuid2(),
    group: z.string(),
  }),
  async (input) => {
    console.log("triggering issue", input);
    const result = await db
      .select({
        ...getTableColumns(issue),
        slug: workspace.slug,
        appName: app.name,
        stageName: stage.name,
        workspaceSlug: workspace.slug,
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
          eq(issueAlertLimit.id, issue.id)
        )
      )
      .where(
        and(
          eq(issue.workspaceID, useWorkspace()),
          eq(issue.stageID, input.stageID),
          eq(issue.group, input.group),
          or(
            // alert first time
            isNull(issueAlertLimit.timeUpdated),
            // do not alert more than once every 30min
            lt(issueAlertLimit.timeUpdated, sql`NOW() - INTERVAL 30 MINUTE`),
            // if issue resolved after last alert, send alert
            gt(issue.timeResolved, issueAlertLimit.timeUpdated)
          ),
          isNull(issue.timeIgnored)
        )
      )
      .then((rows) => rows[0]);

    if (!result) {
      console.log("not alertable");
      return;
    }

    console.log("alerting", result.id);

    const alerts = await db
      .select()
      .from(alert)
      .where(eq(alert.workspaceID, useWorkspace()));

    console.log("alerts", alerts.length);

    for (const alert of alerts) {
      const { source, destination } = alert;
      if (!matchAlert(result.appName, result.stageName, source)) continue;

      if (destination.type === "slack") {
        const context = (function () {
          const match = result.stack?.find((frame) => frame.important);
          if (!match?.context) return;
          const offset = Math.max(1, match.line! - 3);
          const active = Math.min(3, match.line! - 1);
          const max = (offset + match.context.length - 1).toString().length;
          return [
            "# " + match.file,
            "-",
            ...match.context.map((line, index) => {
              return `${(index + offset)
                .toString()
                .padStart(max, " ")}  ${line}`;
            }),
          ].join("\n");
        })();
        const blocks: KnownBlock[] = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: [
                `*<https://console.sst.dev/${result.slug}/${result.appName}/${result.stageName}/issues/${result.id} | ${result.error}>*`,
                result.message.substring(0, 2000),
                "_" + [result.appName, result.stageName].join(" / ") + "_",
              ].join("\n"),
            },
          },
        ];

        // insert into position 1
        if (context) {
          blocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: ["```", context, "```"].join("\n"),
            },
          });
        }
        try {
          console.log("sending slack");
          await Slack.send({
            channel: destination.properties.channel,
            blocks,
            text: `${result.error}: ${result.message.substring(0, 512)}`,
          });
          await Warning.remove({
            stageID: input.stageID,
            type: "issue_alert_slack",
            target: alert.id,
          });
        } catch {
          await Warning.create({
            stageID: input.stageID,
            type: "issue_alert_slack",
            target: alert.id,
            data: {
              channel: destination.properties.channel,
            },
          });
        }
      }

      if (destination.type === "email") {
        console.log("rendering email");
        const html = render(
          // @ts-ignore
          IssueEmail({
            issue: result,
            stage: result.stageName,
            app: result.appName,
            assetsUrl: `https://console.sst.dev/email`,
            consoleUrl: "https://console.sst.dev",
            workspace: result.workspaceSlug,
          })
        );
        console.log("rendered email");
        const users = await db
          .select({
            email: user.email,
          })
          .from(user)
          .where(
            and(
              eq(user.workspaceID, useWorkspace()),
              destination.properties.users === "*"
                ? undefined
                : inArray(user.id, destination.properties.users),
              isNull(user.timeDeleted),
              isNotNull(user.timeSeen)
            )
          );
        console.log(
          "sending email to",
          users.map((u) => u.email)
        );
        if (!users.length) continue;
        try {
          await ses.send(
            new SendEmailCommand({
              Destination: {
                ToAddresses: users.map((u) => u.email),
              },
              ReplyToAddresses: [
                `alert+issues+${result.id}@${process.env.EMAIL_DOMAIN}`,
              ],
              FromEmailAddress: `${result.appName}/${result.stageName} via SST <alert+issues+${result.id}@${process.env.EMAIL_DOMAIN}>`,
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
                    Data: `Error: ${encodeURIComponent(result.error)}`,
                  },
                },
              },
            })
          );
        } catch (ex) {
          console.error(ex);
        }
      }
    }

    if (alerts.length)
      await db
        .insert(issueAlertLimit)
        .values({
          id: result.id,
          workspaceID: useWorkspace(),
        })
        .onDuplicateKeyUpdate({
          set: {
            timeUpdated: sql`NOW()`,
          },
        });
  }
);

export const triggerRateLimit = zod(
  z.object({
    app: z.string(),
    stage: z.string(),
    stageID: z.string().cuid2(),
  }),
  async (input) => {
    const alerts = await Alert.list();

    for (const alert of alerts) {
      const { source, destination } = alert;
      if (!matchAlert(input.app, input.stage, source)) continue;

      const workspaceID = useWorkspace();
      const workspace = await Workspace.fromID(workspaceID);
      const message =
        "Some of your functions hit a soft limit for the number of issues per hour. You can re-enable them or contact us to lift the limit.";

      if (destination.type === "slack") {
        const link = `https://console.sst.dev/${workspace!.slug}/${input.app}/${
          input.stage
        }/issues`;
        const blocks: KnownBlock[] = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: [
                message,
                `*<${link} | Enable Issues>*`,
                "_" + [input.app, input.stage].join(" / ") + "_",
              ].join("\n"),
            },
          },
        ];

        try {
          console.log("sending slack");
          await Slack.send({
            channel: destination.properties.channel,
            blocks,
            text: message,
          });
          await Warning.remove({
            stageID: input.stageID,
            type: "issue_alert_slack",
            target: alert.id,
          });
        } catch {
          await Warning.create({
            stageID: input.stageID,
            type: "issue_alert_slack",
            target: alert.id,
            data: {
              channel: destination.properties.channel,
            },
          });
        }
      }

      if (destination.type === "email") {
        const subject = "Issues temporarily disabled";
        const html = render(
          // @ts-ignore
          IssueRateLimitEmail({
            stage: input.stage,
            app: input.app,
            subject,
            message,
            assetsUrl: `https://console.sst.dev/email`,
            consoleUrl: "https://console.sst.dev",
            workspace: workspace!.slug,
          })
        );
        const users = await db
          .select({
            email: user.email,
          })
          .from(user)
          .where(
            and(
              eq(user.workspaceID, useWorkspace()),
              destination.properties.users === "*"
                ? undefined
                : inArray(user.id, destination.properties.users),
              isNull(user.timeDeleted)
            )
          );
        console.log(
          "sending email to",
          users.map((u) => u.email)
        );
        try {
          await ses.send(
            new SendEmailCommand({
              Destination: {
                ToAddresses: users.map((u) => u.email),
              },
              ReplyToAddresses: [`alert+issues@${process.env.EMAIL_DOMAIN}`],
              FromEmailAddress: `${input.app}/${input.stage} via SST <alert+issues@${process.env.EMAIL_DOMAIN}>`,
              Content: {
                Simple: {
                  Body: {
                    Html: {
                      Data: html,
                    },
                    Text: {
                      Data: message,
                    },
                  },
                  Subject: {
                    Data: subject,
                  },
                },
              },
            })
          );
        } catch (ex) {
          console.error(ex);
        }
      }
    }
  }
);

function matchAlert(appName: string, stageName: string, source: Alert.Source) {
  return (
    (source.app === "*" || source.app.includes(appName)) &&
    (source.stage === "*" || source.stage.includes(stageName))
  );
}
