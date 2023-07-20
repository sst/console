import { Api, StackContext, StaticSite, use } from "sst/constructs";
import { API } from "./api";
import { Auth } from "./auth";
import { DNS } from "./dns";
import { Connect } from "./connect";

export function Web({ stack }: StackContext) {
  const dns = use(DNS);
  const api = use(API);
  const auth = use(Auth);
  const connect = use(Connect);

  const workspace = new StaticSite(stack, "workspace", {
    path: "./packages/web/workspace",
    buildOutput: "./dist",
    buildCommand: "pnpm build",
    customDomain: {
      domainName: "console." + dns.domain,
      hostedZone: dns.zone,
    },
    environment: {
      VITE_API_URL: api.customDomainUrl || api.url,
      VITE_AUTH_URL: auth.url,
      VITE_IOT_HOST:
        stack.stage === "production"
          ? "aebfn7iaj9d1x-ats.iot.us-east-1.amazonaws.com"
          : "a39w1dev1zzfpb-ats.iot.us-east-1.amazonaws.com",
      VITE_STAGE: stack.stage,
      VITE_CONNECT_URL: connect.template,
    },
  });

  stack.addOutputs({
    WorkspaceUrl: workspace.customDomainUrl,
    Output: "216",
  });
}
