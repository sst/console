import { withActor } from "@console/core/actor";
import { MonitorEvent, Run } from "@console/core/run/run";
import {
  SchedulerClient,
  DeleteScheduleCommand,
} from "@aws-sdk/client-scheduler";
import { RETRY_STRATEGY } from "@console/core/util/aws";
const scheduler = new SchedulerClient({ retryStrategy: RETRY_STRATEGY });

export async function handler(evt: MonitorEvent) {
  const { workspaceID, runID, groupName, scheduleName } = evt;
  await withActor(
    {
      type: "system",
      properties: {
        workspaceID,
      },
    },
    async () => {
      await Run.completed({ runID, error: "Build timed out" });

      try {
        await scheduler.send(
          new DeleteScheduleCommand({
            Name: scheduleName,
            GroupName: groupName,
          })
        );
      } catch (e: any) {
        if (e.name !== "ResourceNotFoundException") {
          throw e;
        }
      }
    }
  );
}
