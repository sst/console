import { withActor } from "@console/core/actor";
import { LogPoller } from "@console/core/log/poller";
import { Replicache } from "@console/core/replicache";

export const handler = (evt: any) => {
  console.log(evt);
  const input = JSON.parse(evt.detail.input);
  console.log("input", input);
  return withActor(
    {
      type: "system",
      properties: {
        workspaceID: input.workspaceID,
      },
    },
    async () => {
      console.log("status", evt.detail.status);
      if (evt.detail.status === "RUNNING") {
        console.log(
          "setting execution arn",
          input.pollerID,
          evt.detail.executionArn,
        );
        await LogPoller.setExecution({
          id: input.pollerID,
          executionARN: evt.detail.executionArn,
        });
        return;
      }

      await LogPoller.remove(input.pollerID);
      // if (["SUCCEEDED"].includes(evt.detail.status)) return;
      // const restarted = await LogPoller.subscribe(input);
      // console.log("restarted", restarted);

      await Replicache.poke();
    },
  );
};
