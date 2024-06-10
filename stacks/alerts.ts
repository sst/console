import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { StackContext } from "sst/constructs";

export function Alerts({ stack }: StackContext) {
  const alerts = new Topic(stack, "alerts");
  alerts.addSubscription(
    new EmailSubscription(
      "alert-sst-aaaanfxph6mglwqxacgpdhpbrq@anomaly-innovations.slack.com",
    ),
  );

  return alerts;
}
