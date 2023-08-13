import { StackContext, use } from "sst/constructs";
import { Auth as SSTAuth } from "sst/constructs/future";
import { Secrets } from "./secrets";
import { DNS } from "./dns";

export function Auth({ stack, app }: StackContext) {
  const { github, database, botpoison } = use(Secrets);
  const dns = use(DNS);
  const auth = new SSTAuth(stack, "auth", {
    authenticator: {
      handler: "packages/functions/src/auth.handler",
      bind: [
        github.GITHUB_CLIENT_ID,
        github.GITHUB_CLIENT_SECRET,
        database.PLANETSCALE_PASSWORD,
        database.PLANETSCALE_USERNAME,
        botpoison,
      ],
      environment: {
        AUTH_FRONTEND_URL:
          app.mode === "dev"
            ? "http://localhost:3000"
            : "https://" + dns.domain,
        EMAIL_DOMAIN: use(DNS).domain,
      },
      permissions: ["ses"],
    },
    customDomain: {
      domainName: "auth." + dns.domain,
      hostedZone: dns.zone.zoneName,
    },
  });

  stack.addOutputs({
    AuthEndpoint: auth.url,
  });

  return auth;
}
