import { ResourceNotFoundException } from "@aws-sdk/client-cloudwatch";
import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  PutDestinationCommand,
  DescribeDestinationsCommand,
  PutDestinationPolicyCommand,
  PutSubscriptionFilterCommand,
  DescribeSubscriptionFiltersCommand,
  DeleteSubscriptionFilterCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { provideActor } from "@console/core/actor";
import { App } from "@console/core/app";
import { Resource } from "@console/core/app/resource";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(
  App.Stage.Events.ResourcesUpdated,
  async (evt) => {
    provideActor(evt.metadata.actor);
    const config = await App.Stage.assumeRole(evt.properties.stageID);
    if (!config) return;

    const uniqueIdentifier = `sst#${config.region}#${config.awsAccountID}#${config.app}#${config.stage}`;
    const cw = new CloudWatchLogsClient({ region: config.region });
    const destination = await cw.send(
      new PutDestinationCommand({
        destinationName: uniqueIdentifier,
        roleArn: process.env.ISSUES_ROLE_ARN,
        targetArn: process.env.ISSUES_STREAM_ARN,
      })
    );
    await cw.send(
      new PutDestinationPolicyCommand({
        destinationName: uniqueIdentifier,
        accessPolicy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                AWS: config.awsAccountID,
              },
              Action: "logs:PutSubscriptionFilter",
              Resource: destination.destination?.arn,
            },
          ],
        }),
      })
    );

    const userClient = new CloudWatchLogsClient(config);

    // Get all function resources
    const functions = await Resource.listFromStageID({
      stageID: evt.properties.stageID,
      types: ["Function"],
    });
    console.log("updating", functions.length, "functions");
    for (const fn of functions) {
      const createFilter = async () => {
        // @ts-expect-error
        const logGroupName = `/aws/lambda/${fn.metadata.arn.split(":")[6]}`;
        const all = await userClient.send(
          new DescribeSubscriptionFiltersCommand({
            logGroupName,
          })
        );

        if (false) {
          for (const filter of all.subscriptionFilters ?? []) {
            if (
              filter.filterName === uniqueIdentifier &&
              filter.destinationArn === destination.destination?.arn
            ) {
              return;
            }

            if (filter.filterName?.startsWith("sst#")) {
              // TODO: disable for now
              // await userClient.send(
              //   new DeleteSubscriptionFilterCommand({
              //     logGroupName,
              //     filterName: filter.filterName,
              //   })
              // );
              continue;
            }
          }
        }
        await userClient.send(
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
              ...(fn.enrichment.runtime?.startsWith("nodejs")
                ? [`?"\tERROR\t"`]
                : []),
            ].join(" "),
            logGroupName,
          })
        );
      };

      const createLogGroup = () =>
        userClient.send(
          new CreateLogGroupCommand({
            // @ts-expect-error
            logGroupName: `/aws/lambda/${fn.metadata.arn.split(":")[6]}`,
          })
        );

      try {
        const result = await createFilter();
      } catch (e: any) {
        if (
          e instanceof ResourceNotFoundException &&
          e.message.startsWith("The specified log group does not exist")
        ) {
          await createLogGroup();
          await createFilter();
          continue;
        }
        throw e;
      }
    }
  }
);
