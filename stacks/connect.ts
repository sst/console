import { AnyPrincipal } from "aws-cdk-lib/aws-iam";
import { BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { StackContext, Function, Bucket, Script, use } from "sst/constructs";
import { Secrets } from "./secrets";
import { Events } from "./events";

export function Connect({ stack }: StackContext) {
  const secrets = use(Secrets);
  const bus = use(Events);
  const connect = new Function(stack, "connect", {
    handler: "packages/functions/src/connect.handler",
    permissions: ["sts"],
    bind: [bus, ...Object.values(secrets.database)],
  });
  connect.grantInvoke(new AnyPrincipal());

  const bucket = new Bucket(stack, "connect-bucket");
  const template = new BucketDeployment(stack, "connect-template", {
    sources: [
      Source.jsonData("template.json", {
        AWSTemplateFormatVersion: "2010-09-09",
        Description:
          "Connect your AWS account to access the SST Console. Must be deployed in us-east-1",
        Parameters: {
          workspaceID: {
            Type: "String",
            Description:
              "This is the ID of your SST Console workspace, do not edit.",
          },
        },
        Outputs: {},
        Resources: {
          SSTRole: {
            Type: "AWS::IAM::Role",
            Properties: {
              RoleName: {
                "Fn::Join": [
                  "-",
                  [
                    "sst",
                    {
                      Ref: "workspaceID",
                    },
                  ],
                ],
              },
              AssumeRolePolicyDocument: {
                Version: "2012-10-17",
                Statement: [
                  {
                    Effect: "Allow",
                    Principal: {
                      AWS: stack.account,
                    },
                    Action: "sts:AssumeRole",
                    Condition: {
                      StringEquals: {
                        "sts:ExternalId": {
                          Ref: "workspaceID",
                        },
                      },
                    },
                  },
                ],
              },
              ManagedPolicyArns: [
                "arn:aws:iam::aws:policy/AdministratorAccess",
              ],
            },
          },
          SSTConnect: {
            Type: "Custom::SSTConnect",
            Properties: {
              ServiceToken: connect.functionArn,
              accountID: {
                Ref: "AWS::AccountId",
              },
              region: {
                Ref: "AWS::Region",
              },
              role: {
                "Fn::GetAtt": ["SSTRole", "Arn"],
              },
              workspaceID: {
                Ref: "workspaceID",
              },
            },
          },
        },
      }),
    ],
    destinationBucket: bucket.cdk.bucket,
    accessControl: BucketAccessControl.PUBLIC_READ,
  });

  stack.addOutputs({
    connect: connect.functionArn,
  });

  return {
    template: bucket.cdk.bucket.urlForObject("template.json"),
  };
}
