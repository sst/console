import { Actor, provideActor, useActor } from "@console/core/actor";
import { useHeader, Response } from "sst/node/api";
import { User } from "@console/core/user";
import { sessions } from "./sessions";

export const useApiAuth = async (): Promise<Actor> => {
  const session = sessions.use();

  const workspaceID = useHeader("x-sst-workspace");
  if (!workspaceID) return session;
  console.log("auth workspace", workspaceID);
  if (session.type !== "account")
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
  const user = await User.fromEmail(session.properties.email);
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
};

export function NotPublic() {
  const actor = useActor();
  if (actor.type === "public")
    throw new Response({
      statusCode: 401,
      body: "Unauthorized",
    });
}
