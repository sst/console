import { provideActor } from "@console/core/actor";
import { App, Stage } from "@console/core/app";
import { User } from "@console/core/user";

provideActor({
  type: "system",
  properties: {
    workspaceID: "vah29vy1z2hg0go77055dm34",
  },
});

await Stage.Events.Connected.publish({
  stageID: "ef0c9s6awgusanoeh6rl79mi",
});
// const result = await App.Stage.syncMetadata("vdapvhs9olt0fdzsfja99x5t");
