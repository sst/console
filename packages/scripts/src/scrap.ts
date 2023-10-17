import { db } from "@console/core/drizzle";
import { issueAlert } from "@console/core/issue/issue.sql";
import { slackTeam } from "@console/core/slack/slack.sql";
import { createId } from "@console/core/util/sql";

const slackTeams = await db.select().from(slackTeam);

await db.insert(issueAlert).values({
  workspaceID: "vn5ubp6sxv52de6cso8kb015",
  id: createId(),
  source: {
    stage: "*",
    app: "*",
  },
  destination: {
    type: "email",
    properties: {
      to: ["dax@sst.dev", "frank@sst.dev", "jay@sst.dev"],
    },
  },
});
