import { db } from "@console/core/drizzle";
import { issueAlert } from "@console/core/issue/issue.sql";
import { slackTeam } from "@console/core/slack/slack.sql";
import { createId } from "@console/core/util/sql";

const slackTeams = await db.select().from(slackTeam);

for (const team of slackTeams) {
  await db.insert(issueAlert).values({
    workspaceID: team.workspaceID,
    id: createId(),
    source: {
      stage: "*",
      app: "*",
    },
    destination: {
      type: "slack",
      properties: {
        team: team.teamID,
        channel: "#alerts-sst",
      },
    },
  });
}
