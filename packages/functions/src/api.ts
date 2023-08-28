import { assertActor, provideActor, useActor } from "@console/core/actor";
import { useHeader, Response } from "sst/node/api";
import { User } from "@console/core/user";
import { sessions } from "./sessions";
import { Context } from "sst/context";

export const useApiAuth = Context.memo(async () => {
  const session = sessions.use();
  console.log("auth session", session);
  provideActor(session);
  const actor = useActor();

  const workspaceID = useHeader("x-sst-workspace");
  if (workspaceID) {
    console.log("auth workspace", workspaceID);
    if (actor.type !== "account")
      throw new Response({
        statusCode: 401,
        body: "Unauthorized",
      });

    provideActor({
      type: "system",
      properties: {
        workspaceID,
      },
    });
    const user = await User.fromEmail(actor.properties.email);
    if (!user || user.timeDeleted)
      throw new Response({
        statusCode: 401,
        body: "Unauthorized",
      });

    provideActor({
      type: "user",
      properties: {
        workspaceID,
        userID: user.id,
      },
    });
    console.log("auth user", user.id);
  }
});

export async function NotPublic() {
  await useApiAuth();
  const actor = useActor();
  if (actor.type === "public")
    throw new Response({
      statusCode: 401,
      body: "Unauthorized",
    });
}
