import { Duration } from "aws-cdk-lib/core";
import { Bucket, StackContext } from "sst/constructs";

export function Storage(ctx: StackContext) {
  const storage = new Bucket(ctx.stack, "storage", {
    cdk: {
      bucket: {
        lifecycleRules: [
          {
            prefix: "temporary/daily",
            expiration: Duration.days(1),
          },
          {
            prefix: "temporary/weekly/",
            expiration: Duration.days(7),
          },
          {
            prefix: "temporary/monthly/",
            expiration: Duration.days(30),
          },
        ],
      },
    },
  });
  storage.addNotifications(ctx.stack, {});
  return storage;
}
