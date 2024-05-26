import { Account } from "@console/core/account";
import { assertActor } from "@console/core/actor";
import { User } from "@console/core/user";
import { withApiAuth } from "src/api";
import { ApiHandler } from "sst/node/api";

export const handler = ApiHandler(
  withApiAuth(async () => {
    const actor = assertActor("account");
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: actor.properties.accountID,
        email: actor.properties.email,
        workspaces: await Account.workspaces(),
      }),
    };
  }),
);
