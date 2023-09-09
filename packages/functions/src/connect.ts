import { fetch } from "undici";
import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
} from "aws-lambda";
import { AWS } from "@console/core/aws";
import { provideActor } from "@console/core/actor";
import { Replicache } from "@console/core/replicache";

export async function handler(event: CloudFormationCustomResourceEvent) {
  let status: CloudFormationCustomResourceResponse["Status"] = "SUCCESS";
  if (event.RequestType === "Create") {
    try {
      provideActor({
        type: "system",
        properties: {
          workspaceID: event.ResourceProperties.workspaceID,
        },
      });
      const credentials = await AWS.assumeRole(
        event.ResourceProperties.accountID
      );
      if (credentials) {
        await AWS.Account.create({
          accountID: event.ResourceProperties.accountID,
        });
        await Replicache.poke();
        console.log(credentials);
        status = "SUCCESS";
      } else {
        status = "FAILED";
      }
    } catch (ex) {
      console.error(ex);
      status = "FAILED";
    }
  }

  if (event.RequestType === "Delete") {
  }

  const json: CloudFormationCustomResourceResponse = {
    Status: status,
    Reason: "",
    StackId: event.StackId,
    RequestId: event.RequestId,
    PhysicalResourceId: "none",
    LogicalResourceId: event.LogicalResourceId,
  };

  await fetch(event.ResponseURL, {
    method: "PUT",
    body: JSON.stringify(json),
  });
}
