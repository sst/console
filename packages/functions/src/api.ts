import { assertActor, provideActor, useActor } from "@console/core/actor";
import { useHeader } from "sst/node/api";
import { User } from "@console/core/user";
import { sessions } from "./sessions";

export async function useApiAuth() {
  try {
    useActor();
  } catch {
    const session = sessions.use();
    provideActor(session);
  }

  const workspaceID = useHeader("x-sst-workspace");
  if (workspaceID) {
    console.log("auth workspace", workspaceID);
    const account = assertActor("account");
    provideActor({
      type: "system",
      properties: {
        workspaceID,
      },
    });
    const user = await User.fromEmail(account.properties.email);
    if (!user || user.timeDeleted)
      throw new Error(
        `User not found for email ${account.properties.email} in workspace ${workspaceID}`
      );

    console.log("using user actor", user.id);
    provideActor({
      type: "user",
      properties: {
        workspaceID,
        userID: user.id,
      },
    });
  }
}
