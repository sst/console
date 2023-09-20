import { withActor, useActor } from "@console/core/actor";
import { NotPublic } from "../../api";
import {
  ApiHandler,
  useHeader,
  useJsonBody,
  useQueryParam,
} from "sst/node/api";
import { PatchOperation, PullRequest, PullResponseV1 } from "replicache";
import { sessions } from "../../sessions";
import { generateData } from "./data";

export const handler = ApiHandler(async () => {
  const session = sessions.use();
  const workspaceID = useHeader("x-sst-workspace");

  return withActor(
    !workspaceID
      ? session
      : {
          type: "user",
          properties: {
            workspaceID,
            userID: "dummy-user",
          },
        },
    () => {
      const actor = useActor();
      NotPublic();

      const req: PullRequest = useJsonBody();
      const cookie = req.cookie as number;
      const patch: PatchOperation[] = [];
      console.log("request", req);

      const response: PullResponseV1 = {
        patch,
        cookie: cookie + 1,
        lastMutationIDChanges: {},
      };

      patch.push({
        op: "clear",
      });
      patch.push({
        op: "put",
        key: "/init",
        value: true,
      });

      const data = generateData(useQueryParam("dummy") || "empty");
      for (const item of data) {
        const { _type, ...value } = item;
        if (actor.type === "account" && !["workspace", "user"].includes(_type))
          continue;
        patch.push({
          op: "put",
          key: "/" + [_type, item.id].join("/"),
          value: value as any,
        });
      }

      return {
        statusCode: 200,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(response),
      };
    }
  );
});
