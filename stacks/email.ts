import { StackContext, use } from "sst/constructs";
import { EmailIdentity, Identity } from "aws-cdk-lib/aws-ses";
import { HostedZone, TxtRecord, MxRecord } from "aws-cdk-lib/aws-route53";
import { DNS } from "./dns";

export function Email(ctx: StackContext) {
  if (ctx.stack.stage !== "production") return;
  const dns = use(DNS);
  const email = new EmailIdentity(ctx.stack, "identity", {
    identity: Identity.publicHostedZone(dns.zone),
  });

  new TxtRecord(ctx.stack, "spf-record", {
    recordName: dns.zone.zoneName,
    values: ["v=spf1 include:amazonses.com ~all"],
    zone: dns.zone,
  });

  new TxtRecord(ctx.stack, "dmarc-record", {
    recordName: `_dmarc.${dns.zone.zoneName}`,
    zone: dns.zone,
    values: [`v=DMARC1; p=reject; rua=mailto:dmarc@${dns.zone.zoneName};`],
  });

  new MxRecord(ctx.stack, "mx-record", {
    recordName: dns.zone.zoneName,
    zone: dns.zone,
    values: [
      { priority: 1, hostName: "ASPMX.L.GOOGLE.COM." },
      { priority: 5, hostName: "ALT1.ASPMX.L.GOOGLE.COM." },
      { priority: 5, hostName: "ALT2.ASPMX.L.GOOGLE.COM." },
      { priority: 10, hostName: "ALT3.ASPMX.L.GOOGLE.COM." },
      { priority: 10, hostName: "ALT4.ASPMX.L.GOOGLE.COM." },
    ],
  });

  return {
    domain: dns.domain,
  };
}
