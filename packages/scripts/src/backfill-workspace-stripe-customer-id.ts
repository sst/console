import { Workspace } from "@console/core/workspace";
import { provideActor } from "@console/core/actor";

const workspaces = await Workspace.list();

for (const workspace of workspaces) {
  provideActor({
    type: "system",
    properties: {
      workspaceID: workspace.id,
    },
  });

  await Workspace.Events.Created.publish({
    workspaceID: workspace.id,
  });
}
