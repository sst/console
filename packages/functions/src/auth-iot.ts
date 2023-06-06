import { assertActor, provideActor } from "@console/core/actor";
import { Config } from "sst/node/config";
import { Session } from "sst/node/future/auth";
import { db } from "@console/core/drizzle";
import { user } from "@console/core/user/user.sql";
import { eq } from "drizzle-orm";

export async function handler(evt: any) {
  const tokens = Buffer.from(evt.protocolData.mqtt.password, "base64")
    .toString()
    .split(";");
  const workspaces = [] as string[];
  for (const token of tokens) {
    const session = Session.verify(token);
    provideActor(session as any);
    const account = assertActor("account");
    const rows = await db
      .select({
        workspaceID: user.workspaceID,
      })
      .from(user)
      .where(eq(user.email, account.properties.email))
      .execute();
    workspaces.push(...rows.map((r) => r.workspaceID));
  }
  console.log("workspaces", workspaces);
  const policy = {
    isAuthenticated: true, //A Boolean that determines whether client can connect.
    principalId: Date.now().toString(), //A string that identifies the connection in logs.
    disconnectAfterInSeconds: 86400,
    refreshAfterInSeconds: 300,
    policyDocuments: [
      {
        Version: "2012-10-17",
        Statement: workspaces.flatMap((workspaceID) => [
          {
            Action: "iot:Connect",
            Effect: "Allow",
            Resource: "*",
          },
          {
            Action: "iot:Receive",
            Effect: "Allow",
            Resource: `arn:aws:iot:us-east-1:${process.env.ACCOUNT}:topic/${Config.APP}/${Config.STAGE}/${workspaceID}/*`,
          },
          {
            Action: "iot:Subscribe",
            Effect: "Allow",
            Resource: `arn:aws:iot:us-east-1:${process.env.ACCOUNT}:topicfilter/${Config.APP}/${Config.STAGE}/${workspaceID}/*`,
          },
        ]),
      },
    ],
  };
  console.log(JSON.stringify(policy, null, 2));
  return policy;
}
