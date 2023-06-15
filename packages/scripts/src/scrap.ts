import { Workspace } from "@console/core/workspace";
import { User } from "@console/core/user";
import { provideActor } from "@console/core/actor";

{
  const workspaceID = await Workspace.create({
    slug: "goodvisit",
  });

  provideActor({
    type: "system",
    properties: {
      workspaceID,
    },
  });

  await User.create({
    email: "mail@thdxr.com",
  });
}

export {};
