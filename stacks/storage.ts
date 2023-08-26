import { Duration } from "aws-cdk-lib/core";
import { Bucket, StackContext } from "sst/constructs";

export function Storage(ctx: StackContext) {
  const ephemeral = new Bucket(ctx.stack, "ephemeral", {
    cdk: {
      bucket: {
        lifecycleRules: [
          {
            expiration: Duration.days(1),
          },
        ],
      },
    },
  });
  return {
    ephemeral,
  };
}
