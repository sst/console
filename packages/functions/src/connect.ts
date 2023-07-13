import { fetch } from "undici";
import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
} from "aws-lambda";
import { AWS } from "@console/core/aws";
import { provideActor } from "@console/core/actor";
import { useTransaction } from "@console/core/util/transaction";

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
      await useTransaction(async () => {
        const existing = await AWS.Account.fromAccountID(
          event.ResourceProperties.accountID
        );
        if (existing) return existing.id;
        return await AWS.Account.create({
          accountID: event.ResourceProperties.accountID,
        });
      });
      console.log(credentials);
      status = "SUCCESS";
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
