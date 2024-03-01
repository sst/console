import { Stage } from "@console/core/app/stage";
import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { Queue } from "sst/node/queue";
import { chunk } from "remeda";
import { createId } from "@console/core/util/sql";

const sqs = new SQSClient({});
export async function handler() {
  const stages = await Stage.list();
  console.log("stages", stages.length);
  let index = 0;
  for (const stage of chunk(stages, 10)) {
    await sqs.send(
      new SendMessageBatchCommand({
        QueueUrl: Queue.UsageQueue.queueUrl,
        Entries: stage.map((stage) => ({
          Id: createId(),
          MessageDeduplicationId: createId(),
          MessageBody: JSON.stringify({
            stageID: stage.id,
            workspaceID: stage.workspaceID,
            daysOffset: 1,
          }),
          MessageGroupId: (index++ % 10).toString(),
        })),
      })
    );
  }
}
