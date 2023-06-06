import { ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { StackContext, use } from "sst/constructs";
import { CfnAuthorizer } from "aws-cdk-lib/aws-iot";
import { Function } from "sst/constructs";
import { Auth } from "./auth";
import { Secrets } from "./secrets";

export function Realtime(ctx: StackContext) {
  const auth = use(Auth);
  const secrets = use(Secrets);
  const authorizerFn = new Function(ctx.stack, "authorizer-fn", {
    handler: "packages/functions/src/auth-iot.handler",
    bind: [auth, ...Object.values(secrets.database)],
    permissions: ["iot"],
    environment: {
      ACCOUNT: ctx.app.account,
    },
  });

  const authorizer = new CfnAuthorizer(ctx.stack, "authorizer", {
    status: "ACTIVE",
    authorizerName: ctx.app.logicalPrefixedName("authorizer"),
    authorizerFunctionArn: authorizerFn.functionArn,
    signingDisabled: true,
  });

  authorizerFn.addPermission("IOTPermission", {
    principal: new ServicePrincipal("iot.amazonaws.com"),
    sourceArn: authorizer.attrArn,
    action: "lambda:InvokeFunction",
  });

  return {};
}
