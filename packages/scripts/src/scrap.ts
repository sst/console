import { Workspace } from "@console/core/workspace";
import { User } from "@console/core/user";
import { provideActor } from "@console/core/actor";

provideActor({
  type: "system",
  properties: {
    workspaceID: "cjl2fmobui506ctxs8bdvsez",
  },
});

await User.create({
  id: "pnludxtej0qprh7kk10saipp",
  email: "mail@thdxr.com",
});

export {};
