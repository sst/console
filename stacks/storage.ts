import { Duration } from "aws-cdk-lib/core";
import { Bucket, StackContext } from "sst/constructs";

export function Storage(ctx: StackContext) {
  const storage = new Bucket(ctx.stack, "storage", {
    cdk: {
      bucket: {
        lifecycleRules: [
          {
            prefix: "temporary/",
            expiration: Duration.days(1),
          },
        ],
      },
    },
  });
  return storage;
}
