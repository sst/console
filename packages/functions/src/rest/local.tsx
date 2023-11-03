import { assertActor } from "@console/core/actor";
import { app, stage } from "@console/core/app/app.sql";
import { and, db, eq } from "@console/core/drizzle";
import { user } from "@console/core/user/user.sql";
import { workspace } from "@console/core/workspace/workspace.sql";
import { withApiAuth } from "src/api";
import { ApiHandler, useJsonBody, useQueryParams } from "sst/node/api";
import { z } from "zod";

const Body = z.object({
  app: z.string(),
  stage: z.string(),
});
export const handler = ApiHandler(
  withApiAuth(async () => {
    const body = Body.parse(useQueryParams());
    const actor = assertActor("account");

    const result = await db
      .select({
        workspace: workspace.slug,
      })
      .from(user)
      .innerJoin(workspace, eq(workspace.id, user.workspaceID))
      .innerJoin(stage, eq(stage.workspaceID, workspace.id))
      .innerJoin(
        app,
        and(eq(app.id, stage.appID), eq(workspace.id, app.workspaceID))
      )
      .where(
        and(
          eq(user.email, actor.properties.email),
          eq(app.name, body.app),
          eq(stage.name, body.stage)
        )
      );

    console.log(result);

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(result.map((item) => item.workspace)),
    };
  })
);
