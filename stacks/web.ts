import { StackContext, StaticSite, use } from "sst/constructs";
import { API } from "./api";
import { Auth } from "./auth";
import { DNS } from "./dns";
import { Realtime } from "./realtime";
import { Connect } from "./connect";
import { HttpMethods } from "aws-cdk-lib/aws-s3";

export function Web({ stack }: StackContext) {
  const dns = use(DNS);
  const api = use(API);
  const auth = use(Auth);
  const realtime = use(Realtime);
  const connect = use(Connect);

  const workspace = new StaticSite(stack, "workspace", {
    path: "./packages/web/workspace",
    buildOutput: "./dist",
    buildCommand: "pnpm build",
    customDomain: {
      domainName: dns.domain,
      hostedZone: dns.zone.zoneName,
    },
    cdk: {
      bucket: {
        cors: [
          {
            allowedMethods: [HttpMethods.GET],
            allowedOrigins: ["*"],
          },
        ],
      },
    },
    environment: {
      VITE_API_URL: api.customDomainUrl || api.url,
      VITE_AUTH_URL: auth.url,
      VITE_IOT_HOST: realtime.endpointAddress,
      VITE_STAGE: stack.stage,
      VITE_CONNECT_URL: connect.template,
    },
  });

  stack.addOutputs({
    WorkspaceUrl: workspace.customDomainUrl,
    Output: "1237",
  });
}
