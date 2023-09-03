import {
  Actor,
  assertActor,
  provideActor,
  useActor,
} from "@console/core/actor";
import { useHeader, Response } from "sst/node/api";
import { User } from "@console/core/user";
import { sessions } from "./sessions";
import { Context } from "sst/context";

export const useApiAuth = async () => {
  const session = sessions.use();
  console.log("auth session", session);
  provideActor(session);
  const actor = useActor();

  const user = await (async (): Promise<Actor | undefined> => {
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

      return {
        type: "user",
        properties: {
          workspaceID,
          userID: user.id,
        },
      };
    }
  })();
  if (user) provideActor(user);
};

export async function NotPublic() {
  await useApiAuth();
  const actor = useActor();
  console.log("non-public", actor);
  if (actor.type === "public")
    throw new Response({
      statusCode: 401,
      body: "Unauthorized",
    });
}
