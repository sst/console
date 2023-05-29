import { HostedZone } from "aws-cdk-lib/aws-route53";
import { StackContext } from "sst/constructs";

export function DNS(ctx: StackContext) {
  const name =
    ctx.stack.stage === "production" ? "production.sst.dev" : `dev.sst.dev`;

  if (ctx.stack.stage === "production" || ctx.stack.stage === "dev") {
    new HostedZone(ctx.stack, "HostedZone", {
      zoneName: name,
    });
  }

  return {
    zone: name,
    domain:
      ctx.stack.stage === "production" ? name : `${ctx.stack.stage}.${name}`,
  };
}
