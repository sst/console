import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { createId } from "@paralleldrive/cuid2";
import { eq, and, isNull, gt, sql, getTableColumns, or, lt } from "drizzle-orm";
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

export const Info = createSelectSchema(issueAlert, {
  source: () => z.custom<Source>(),
  destination: () => z.custom<Destination>(),
});
export type Info = z.infer<typeof Info>;

const ses = new SESv2Client({});

export interface Source {
  app: "*" | string[];
  stage: "*" | string[];
}

export type Destination = SlackDestination | EmailDestination;

export interface SlackDestination {
  type: "slack";
  properties: {
    channel: string;
  };
}

export interface EmailDestination {
  type: "email";
  properties: {
    users: "*" | string[];
  };
}

export const put = zod(
  Info.pick({ id: true, source: true, destination: true }).partial({
    id: true,
  }),
  (input) =>
    useTransaction(async (tx) => {
      const id = input.id ?? createId();
      await tx
        .insert(issueAlert)
        .values({
          id,
          workspaceID: useWorkspace(),
          source: input.source,
          destination: input.destination,
        })
        .onDuplicateKeyUpdate({
          set: {
            source: input.source,
            destination: input.destination,
          },
        });
      return id;
    })
);

export const create = zod(
  Info.pick({ id: true }).partial({ id: true }),
  (input) =>
    useTransaction(async (tx) => {
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
            users: "*",
          },
        },
      });
      return id;
    })
);

export const remove = zod(Info.shape.id, (input) =>
  useTransaction((tx) =>
    tx
      .delete(issueAlert)
      .where(
        and(
          eq(issueAlert.id, input),
          eq(issueAlert.workspaceID, useWorkspace())
        )
      )
  )
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

    console.log("not alertable");
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
                  result.message.substring(0, 2000),
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
            assetsUrl: "https://console.sst.dev/email",
            workspace: result.workspaceSlug,
            settingsUrl: "https://console.sst.dev",
          })
        );
        /*
        const response = await ses.send(
          new SendEmailCommand({
            Destination: {
              ToAddresses: destination.properties.to,
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
                  Data: `Error: ${result.error}`,
                },
              },
            },
          })
        );
        console.log(response);
        */
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
