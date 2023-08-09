import { HostedZone } from "aws-cdk-lib/aws-route53";
import { StackContext } from "sst/constructs";

const PRODUCTION = "console.sst.dev";
const DEV = "console.dev.sst.dev";

export function DNS(ctx: StackContext) {
  if (ctx.stack.stage === "production") {
    return {
      zone: new HostedZone(ctx.stack, "zone", {
        zoneName: PRODUCTION,
      }),
      domain: PRODUCTION,
    };
  }

  if (ctx.stack.stage === "dev") {
    return {
      zone: new HostedZone(ctx.stack, "zone", {
        zoneName: DEV,
      }),
      domain: DEV,
    };
  }

  const zone = HostedZone.fromLookup(ctx.stack, "zone", {
    domainName: DEV,
  });
  return {
    zone,
    domain: `${ctx.stack.stage}.${DEV}`,
  };
}
