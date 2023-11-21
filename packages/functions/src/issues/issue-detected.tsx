import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { withActor } from "@console/core/actor";
import { Issue } from "@console/core/issue";
import { createId } from "@console/core/util/sql";
import { Handler } from "sst/context";
import { Config } from "sst/node/config";
import { EventHandler, EventPayload } from "sst/node/event-bus";
import { Queue } from "sst/node/queue";

const sqs = new SQSClient({});

export const handler = EventHandler(Issue.Events.IssueDetected, async (event) =>
  withActor(event.metadata.actor, async () => {
    console.log(
      await Promise.all([
        sqs.send(
          new SendMessageCommand({
            QueueUrl: Queue["issue-detected-queue"].queueUrl,
            MessageDeduplicationId: createId(),
            MessageBody: JSON.stringify(event),
            MessageGroupId: [
              event.properties.group,
              event.properties.stageID,
            ].join("-"),
          })
        ),
        Issue.expand(event.properties),
      ])
    );
  })
);

export const queue = Handler("sqs", async (event) => {
  console.log("got", event.Records.length, "records");
  for (const record of event.Records) {
    const evt: EventPayload<(typeof Issue)["Events"]["IssueDetected"]> =
      JSON.parse(record.body);
    await withActor(evt.metadata.actor, async () => {
      await Issue.Alert.triggerIssue(evt.properties);
    });
  }
});
