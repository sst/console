import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  PutDestinationCommand,
  PutDestinationPolicyCommand,
  PutSubscriptionFilterCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { Resource } from "@console/core/app/resource";
import { App } from "@console/core/app";
import { Stage } from "@console/core/app/stage";
import { Account } from "@console/core/aws/account";
import { provideActor } from "@console/core/actor";

export async function handler() {
  const workspaceID = "gszunohk1ns7wgn000qunhv5";
  const appID = "jiryzkfewo91uuqa5rfcg1gm";
  const stageID = "irhux3favdlfk4smszoc6m1n";

  provideActor({
    type: "system",
    properties: { workspaceID },
  });

  const app = await App.fromID(appID);
  if (!app) return;
  const stage = await Stage.fromID(stageID);
  if (!stage) return;
  const account = await Account.fromID(stage.awsAccountID);
  if (!account) return;

  // Create log destination
  const uniqueIdentifier = `sst#${account.accountID}#${app.name}#${stage.name}`;
  const sstClient = new CloudWatchLogsClient({ region: stage.region });
  const destination = await sstClient.send(
    new PutDestinationCommand({
      destinationName: uniqueIdentifier,
      roleArn: process.env.ISSUES_ROLE_ARN,
      targetArn: process.env.ISSUES_STREAM_ARN,
    })
  );
  await sstClient.send(
    new PutDestinationPolicyCommand({
      destinationName: uniqueIdentifier,
      accessPolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              AWS: account.accountID,
            },
            Action: "logs:PutSubscriptionFilter",
            Resource: destination.destination?.arn,
          },
        ],
      }),
    })
  );

  // Get stage credentials
  const config = await Stage.assumeRole(stageID);
  if (!config) return;
  const userClient = new CloudWatchLogsClient(config);

  // Get all function resources
  const functions = await Resource.listFromStageID({
    stageID,
    types: ["Function"],
  });
  console.log("functions", functions);
  for (const fn of functions) {
    const createFilter = () =>
      userClient.send(
        new PutSubscriptionFilterCommand({
          destinationArn: destination.destination?.arn,
          filterName: uniqueIdentifier,
          filterPattern: [
            // OOM and other runtime error
            `?"Error: Runtime exited"`,
            // Timeout
            `?"Task timed out after"`,
            // NodeJS Uncaught and console.error
            // @ts-expect-error
            ...(fn.enrichment.runtime?.stratsWith("nodejs")
              ? [`?"\tERROR\t"`]
              : []),
          ].join(" "),
          // @ts-expect-error
          logGroupName: `/aws/lambda/${fn.metadata.arn.split(":")[6]}`,
        })
      );

    const createLogGroup = () =>
      userClient.send(
        new CreateLogGroupCommand({
          // @ts-expect-error
          logGroupName: `/aws/lambda/${fn.metadata.arn.split(":")[6]}`,
        })
      );

    try {
      await createFilter();
    } catch (e: any) {
      if (
        e.name === "ResourceNotFoundException" &&
        e.message.startsWith("The specified log group does not exist")
      ) {
        await createLogGroup();
        await createFilter();
        return;
      }
      throw e;
    }
  }
}
