import { assertActor, withActor } from "@console/core/actor";
import { withApiAuth } from "../api";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { Workspace } from "@console/core/workspace";
import { User } from "@console/core/user";

export const create = ApiHandler(
  withApiAuth(async () => {
    const actor = assertActor("account");
    const body = useJsonBody();
    const parsed = Workspace.create.schema.parse(body);
    try {
      const workspaceID = await Workspace.create(parsed);
      const workspace = await Workspace.fromID(workspaceID);
      await withActor(
        {
          type: "system",
          properties: {
            workspaceID,
          },
        },
        () =>
          User.create({
            email: actor.properties.email,
            first: true,
          }),
      );
      return {
        statusCode: 200,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(workspace),
      };
    } catch {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
      };
    }
  }),
);

export const remove = ApiHandler(
  withApiAuth(async () => {
    const body = useJsonBody();
    const parsed = Workspace.remove.schema.parse(body);
    try {
      await Workspace.remove(parsed);
      return {
        statusCode: 200,
        headers: {
          "content-type": "application/json",
        },
      };
    } catch {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
      };
    }
  }),
);
