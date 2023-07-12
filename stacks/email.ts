import { StackContext, use } from "sst/constructs";
import { EmailIdentity, Identity } from "aws-cdk-lib/aws-ses";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { DNS } from "./dns";

export function Email(ctx: StackContext) {
  if (ctx.stack.stage !== "production") return;
  const dns = use(DNS);
  const email = new EmailIdentity(ctx.stack, "identity", {
    identity: Identity.publicHostedZone(
      HostedZone.fromLookup(ctx.stack, "zone", {
        domainName: dns.domain,
      })
    ),
  });

  return {
    domain: dns.domain,
  };
}
