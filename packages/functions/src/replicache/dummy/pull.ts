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
import { createHash, subtle } from "crypto";

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
      const cookie = (req.cookie || {
        hash: "",
        order: 0,
      }) as {
        hash: string;
        order: number;
      };
      const patch: PatchOperation[] = [];
      console.log("request", req);

      const response: PullResponseV1 = {
        patch: [],
        cookie: cookie,
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
        if (
          actor.type === "account" &&
          !["workspace", "user", "dummyConfig"].includes(_type)
        )
          continue;
        patch.push({
          op: "put",
          key:
            "/" +
            [_type, "id" in item ? item.id : undefined]
              .filter(Boolean)
              .join("/"),
          value: value as any,
        });
      }
      const hash = createHash("sha256")
        .update(JSON.stringify(patch))
        .digest("hex");

      if (cookie.hash !== hash) {
        response.patch = patch;
        response.cookie = {
          hash,
          order: (cookie.order || 0) + 1,
        };
      }

      return {
        statusCode: 200,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(response),
      };
    },
  );
});
