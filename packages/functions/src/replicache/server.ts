import { Server } from "./framework";
import { App } from "@console/core/app";
import { LogPoller } from "@console/core/log/poller";
import { Log } from "@console/core/log/";
import { AWS } from "@console/core/aws";
import { z } from "zod";
import { Workspace } from "@console/core/workspace";
import { Lambda } from "@console/core/lambda";
import { assertActor, provideActor } from "@console/core/actor";
import { User } from "@console/core/user";
import { Issue } from "@console/core/issue";

export const server = new Server()
  .expose("log_poller_subscribe", LogPoller.subscribe)
  .expose("log_search", Log.Search.search)
  .expose("function_invoke", Lambda.invoke)
  .expose("function_payload_save", Lambda.savePayload)
  .expose("function_payload_remove", Lambda.removePayload)
  .expose("issue_ignore", Issue.ignore)
  .expose("issue_unignore", Issue.unignore)
  .expose("issue_resolve", Issue.resolve)
  .expose("issue_unresolve", Issue.unresolve)
  .mutation(
    "connect",
    z.object({
      app: z.string(),
      aws_account_id: z.string(),
      stage: z.string(),
      region: z.string(),
    }),
    async (input) => {
      let appID = await App.fromName(input.app).then((x) => x?.id);
      if (!appID) appID = await App.create({ name: input.app });

      let awsID = await AWS.Account.fromAccountID(input.aws_account_id).then(
        (x) => x?.id
      );

      if (!awsID)
        awsID = await AWS.Account.create({
          accountID: input.aws_account_id,
        });

      await App.Stage.connect({
        appID,
        name: input.stage,
        awsAccountID: awsID,
        region: input.region,
      });
    }
  )
  .mutation(
    "app_stage_sync",
    z.object({ stageID: z.string() }),
    async (input) => await App.Stage.Events.Updated.publish(input)
  )
  .mutation("workspace_create", Workspace.create.schema, async (input) => {
    const actor = assertActor("account");
    const workspace = await Workspace.create(input);
    provideActor({
      type: "system",
      properties: {
        workspaceID: workspace,
      },
    });
    await User.create({
      email: actor.properties.email,
      first: true,
    });
  })
  .expose("user_create", User.create)
  .expose("user_remove", User.remove)
  .expose("app_create", App.create);

export type ServerType = typeof server;
