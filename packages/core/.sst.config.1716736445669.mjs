import { createRequire as topLevelCreateRequire } from 'module';const require = topLevelCreateRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// stacks/dns.ts
import { CnameRecord, HostedZone } from "aws-cdk-lib/aws-route53";
var PRODUCTION = "console.sst.dev";
var DEV = "dev.console.sst.dev";
function DNS(ctx) {
  if (ctx.stack.stage === "production") {
    const zone2 = new HostedZone(ctx.stack, "zone", {
      zoneName: PRODUCTION
    });
    new CnameRecord(ctx.stack, "old", {
      zone: zone2,
      recordName: "old",
      domainName: "sst-console.netlify.app"
    });
    return {
      zone: zone2,
      domain: PRODUCTION
    };
  }
  if (ctx.stack.stage === "dev") {
    return {
      zone: new HostedZone(ctx.stack, "zone", {
        zoneName: DEV
      }),
      domain: DEV
    };
  }
  const zone = HostedZone.fromLookup(ctx.stack, "zone", {
    domainName: DEV
  });
  return {
    zone,
    domain: `${ctx.stack.stage}.${DEV}`
  };
}
__name(DNS, "DNS");

// stacks/api.ts
import {
  Choice,
  Condition,
  DefinitionBody,
  Pass,
  StateMachine,
  Wait,
  WaitTime
} from "aws-cdk-lib/aws-stepfunctions";
import * as events from "aws-cdk-lib/aws-events";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Api, use as use3, Function, EventBus as EventBus3 } from "sst/constructs";

// stacks/auth.ts
import { use } from "sst/constructs";
import { Auth as SSTAuth } from "sst/constructs/future";

// stacks/secrets.ts
import { Config } from "sst/constructs";
function Secrets(ctx) {
  return {
    database: Config.Secret.create(
      ctx.stack,
      "PLANETSCALE_USERNAME",
      "PLANETSCALE_PASSWORD"
    ),
    botpoison: new Config.Secret(ctx.stack, "BOTPOISON_SECRET_KEY"),
    cloudflare: new Config.Secret(ctx.stack, "CLOUDFLARE_TOKEN"),
    github: [
      new Config.Secret(ctx.stack, "GITHUB_APP_ID"),
      new Config.Secret(ctx.stack, "GITHUB_PRIVATE_KEY"),
      new Config.Secret(ctx.stack, "GITHUB_WEBHOOK_SECRET")
    ],
    slack: [
      new Config.Secret(ctx.stack, "SLACK_CLIENT_ID"),
      new Config.Secret(ctx.stack, "SLACK_CLIENT_SECRET")
    ],
    stripe: [
      new Config.Secret(ctx.stack, "STRIPE_SECRET_KEY"),
      new Config.Secret(ctx.stack, "STRIPE_WEBHOOK_SIGNING_SECRET"),
      new Config.Parameter(ctx.stack, "STRIPE_PRICE_ID", {
        value: ctx.stack.stage === "production" ? "price_1NlZmAEAHP8a0ogpglxmSac1" : "price_1NgB4oEAHP8a0ogpxqUXHKee"
      })
    ]
  };
}
__name(Secrets, "Secrets");

// stacks/auth.ts
function Auth({ stack, app }) {
  const { slack, database, botpoison } = use(Secrets);
  const dns = use(DNS);
  const auth = new SSTAuth(stack, "auth", {
    authenticator: {
      handler: "packages/functions/src/auth.handler",
      bind: [
        database.PLANETSCALE_PASSWORD,
        database.PLANETSCALE_USERNAME,
        ...slack,
        botpoison
      ],
      environment: {
        AUTH_FRONTEND_URL: app.mode === "dev" ? "http://localhost:3000" : "https://" + dns.domain,
        EMAIL_DOMAIN: use(DNS).domain
      },
      permissions: ["ses"]
    },
    customDomain: {
      domainName: "auth." + dns.domain,
      hostedZone: dns.zone.zoneName
    }
  });
  stack.addOutputs({
    AuthEndpoint: auth.url
  });
  return auth;
}
__name(Auth, "Auth");

// stacks/events.ts
import { EventBus, use as use2 } from "sst/constructs";

// stacks/storage.ts
import { Duration } from "aws-cdk-lib/core";
import { Bucket } from "sst/constructs";
function Storage(ctx) {
  const storage = new Bucket(ctx.stack, "storage", {
    cdk: {
      bucket: {
        lifecycleRules: [
          {
            prefix: "temporary/",
            expiration: Duration.days(1)
          }
        ]
      }
    }
  });
  storage.addNotifications(ctx.stack, {});
  return storage;
}
__name(Storage, "Storage");

// stacks/events.ts
function Events({ stack }) {
  const bus = new EventBus(stack, "bus", {
    defaults: {
      retries: 20
    }
  });
  const secrets = use2(Secrets);
  const storage = use2(Storage);
  bus.addRules(stack, {
    "cross-account": {
      pattern: {
        source: ["aws.s3"]
      },
      targets: {
        handler: {
          function: {
            handler: "packages/functions/src/events/stack-updated-external.handler",
            bind: [bus, ...Object.values(secrets.database)]
          }
        }
      }
    }
  });
  bus.subscribe("workspace.created", {
    handler: "packages/functions/src/events/workspace-created.handler",
    timeout: "5 minute",
    bind: [...Object.values(secrets.database), ...secrets.stripe, bus],
    permissions: ["sts", "iot"]
  });
  bus.subscribe("app.stage.connected", {
    handler: "packages/functions/src/events/app-stage-connected.handler",
    timeout: "5 minute",
    bind: [...Object.values(secrets.database), bus],
    permissions: ["sts", "iot"]
  });
  bus.subscribe("app.stage.updated", {
    handler: "packages/functions/src/events/app-stage-updated.handler",
    bind: [...Object.values(secrets.database), bus],
    timeout: "15 minute",
    permissions: ["sts", "iot"]
  });
  bus.subscribe("app.stage.usage_requested", {
    handler: "packages/functions/src/events/fetch-usage.handler",
    bind: [...Object.values(secrets.database), ...secrets.stripe, bus],
    timeout: "5 minute",
    permissions: ["sts", "iot"]
  });
  bus.subscribe("aws.account.created", {
    handler: "packages/functions/src/events/aws-account-created.handler",
    bind: [...Object.values(secrets.database), bus],
    timeout: "5 minute",
    permissions: ["sts", "iot"],
    environment: {
      EVENT_BUS_ARN: bus.eventBusArn
    }
  });
  bus.subscribe("aws.account.removed", {
    handler: "packages/functions/src/events/aws-account-removed.handler",
    bind: [...Object.values(secrets.database), bus],
    timeout: "5 minute",
    permissions: ["sts", "iot"],
    environment: {
      EVENT_BUS_ARN: bus.eventBusArn
    }
  });
  bus.subscribe("github.installed", {
    handler: "packages/functions/src/events/github-installed.handler",
    bind: [...Object.values(secrets.database), bus, ...secrets.github],
    timeout: "15 minute",
    permissions: ["sts", "iot"]
  });
  bus.subscribe("user.created", {
    handler: "packages/functions/src/events/user-created.handler",
    permissions: ["ses"],
    bind: [...Object.values(secrets.database)],
    environment: {
      EMAIL_DOMAIN: use2(DNS).domain
    }
  });
  bus.subscribe(
    "log.search.created",
    {
      handler: "packages/functions/src/events/log-scan-created.handler",
      nodejs: {
        install: ["source-map"]
      },
      bind: [...Object.values(secrets.database), storage, bus],
      timeout: "5 minute",
      permissions: ["sts", "iot"]
    },
    {
      retries: 0
    }
  );
  bus.subscribe(["state.lock.created"], {
    handler: "packages/functions/src/events/state-lock-created.handler",
    bind: [...Object.values(secrets.database)],
    permissions: ["sts", "iot"]
  });
  bus.subscribe(["state.summary.created"], {
    handler: "packages/functions/src/events/state-summary-created.handler",
    bind: [...Object.values(secrets.database)],
    permissions: ["sts", "iot"]
  });
  bus.subscribe(["state.history.created"], {
    handler: "packages/functions/src/events/state-history-created.handler",
    bind: [...Object.values(secrets.database)],
    permissions: ["sts", "iot"]
  });
  return bus;
}
__name(Events, "Events");

// stacks/api.ts
import { Duration as Duration2 } from "aws-cdk-lib/core";
function API({ stack, app }) {
  const auth = use3(Auth);
  const secrets = use3(Secrets);
  const bus = use3(Events);
  const dns = use3(DNS);
  const storage = use3(Storage);
  const pollerFetchStep = new LambdaInvoke(stack, "pollerFetchStep", {
    lambdaFunction: Function.fromDefinition(stack, "log-poller-fetch", {
      handler: "packages/functions/src/poller/fetch.handler",
      bind: [...Object.values(secrets.database), storage],
      nodejs: {
        install: ["source-map"]
      },
      timeout: "120 seconds",
      permissions: ["logs", "sts", "iot"]
    }),
    payloadResponseOnly: true,
    resultPath: "$.status"
  });
  const poller = new StateMachine(stack, "poller", {
    definitionBody: DefinitionBody.fromChainable(
      pollerFetchStep.next(
        new Choice(stack, "pollerLoopStep").when(
          Condition.booleanEquals("$.status.done", false),
          new Wait(stack, "pollerWaitStep", {
            time: WaitTime.duration(Duration2.seconds(3))
          }).next(pollerFetchStep)
        ).otherwise(new Pass(stack, "done"))
      )
    )
  });
  new EventBus3(stack, "defaultBus", {
    cdk: {
      eventBus: events.EventBus.fromEventBusName(stack, "default", "default")
    }
  }).addRules(stack, {
    "log-poller-status": {
      pattern: {
        detailType: ["Step Functions Execution Status Change"],
        source: ["aws.states"]
      },
      targets: {
        handler: {
          function: {
            handler: "packages/functions/src/events/log-poller-status.handler",
            bind: [bus, ...Object.values(secrets.database)],
            permissions: ["states", "iot"],
            environment: {
              LOG_POLLER_ARN: poller.stateMachineArn
            }
          }
        }
      }
    }
  });
  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [
          auth,
          ...Object.values(secrets.database),
          ...secrets.stripe,
          ...secrets.github,
          bus
        ],
        timeout: "30 seconds",
        permissions: ["iot", "sts"],
        environment: {
          LOG_POLLER_ARN: poller.stateMachineArn
        }
      }
    },
    routes: {
      "POST /replicache/pull": "packages/functions/src/replicache/pull.handler",
      "POST /replicache/push": "packages/functions/src/replicache/push.handler",
      "POST /replicache/pull1": "packages/functions/src/replicache/pull1.handler",
      "POST /replicache/dummy/pull": "packages/functions/src/replicache/dummy/pull.handler",
      "POST /replicache/push1": "packages/functions/src/replicache/push1.handler",
      "POST /webhook/stripe": "packages/functions/src/billing/webhook.handler",
      "POST /rest/create_checkout_session": "packages/functions/src/billing/create-checkout-session.handler",
      "POST /rest/create_customer_portal_session": "packages/functions/src/billing/create-customer-portal-session.handler",
      "GET /rest/log": {
        function: {
          handler: "packages/functions/src/log/expand.handler",
          nodejs: {
            install: ["source-map"]
          }
        }
      },
      "POST /rest/log/tail": {
        function: {
          handler: "packages/functions/src/rest/log/tail.handler",
          timeout: "120 seconds",
          bind: [storage],
          permissions: ["iot"],
          nodejs: {
            install: ["source-map"]
          }
        }
      },
      "GET /rest/local": "packages/functions/src/rest/local.handler",
      "POST /rest/lambda/invoke": "packages/functions/src/rest/lambda/invoke.handler",
      "GET /freshpaint/track": {
        type: "url",
        url: "https://api.perfalytics.com/track"
      },
      "POST /freshpaint/track": {
        type: "url",
        url: "https://api.perfalytics.com/track"
      },
      "GET /freshpaint/{proxy+}": {
        type: "url",
        url: "https://perfalytics.com/{proxy}"
      },
      "GET /github/installed": "packages/functions/src/github/installed.handler",
      "GET /github/connect": "packages/functions/src/github/connect.handler",
      "POST /github/webhook": {
        function: {
          handler: "packages/functions/src/github/webhook.handler",
          timeout: "120 seconds"
        }
      },
      "GET /": "packages/functions/src/index.handler"
    },
    customDomain: {
      domainName: "api." + dns.domain,
      hostedZone: dns.zone.zoneName
    }
  });
  const hono = new Function(stack, "hono", {
    url: true,
    handler: "packages/functions/src/hono/index.handler",
    runtime: "nodejs18.x",
    nodejs: {
      splitting: true
    }
  });
  stack.addOutputs({
    hono: hono.url
  });
  api.addRoutes(stack, {
    "GET /test/error": {
      type: "function",
      function: {
        handler: "packages/functions/src/error.handler",
        enableLiveDev: false
      }
    }
    // "GET /test/go": {
    //   type: "function",
    //   function: {
    //     runtime: "go",
    //     handler: "./go/handler.go",
    //     enableLiveDev: false,
    //   },
    // },
  });
  poller.grantStartExecution(api.getFunction("POST /replicache/push"));
  poller.grantStartExecution(api.getFunction("POST /replicache/push1"));
  new Function(stack, "scratch", {
    bind: [auth, ...Object.values(secrets.database), bus],
    handler: "packages/functions/src/scratch.handler"
  });
  stack.addOutputs({
    ApiEndpoint: api.customDomainUrl
  });
  return api;
}
__name(API, "API");

// stacks/web.ts
import { StaticSite, use as use6 } from "sst/constructs";

// stacks/realtime.ts
import { ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { use as use4 } from "sst/constructs";
import { CfnAuthorizer } from "aws-cdk-lib/aws-iot";
import { Function as Function2 } from "sst/constructs";
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from "aws-cdk-lib/custom-resources";
function Realtime(ctx) {
  const auth = use4(Auth);
  const secrets = use4(Secrets);
  const authorizerFn = new Function2(ctx.stack, "authorizer-fn", {
    handler: "packages/functions/src/auth-iot.handler",
    bind: [auth, ...Object.values(secrets.database)],
    permissions: ["iot"],
    environment: {
      ACCOUNT: ctx.app.account
    }
  });
  const authorizer = new CfnAuthorizer(ctx.stack, "authorizer", {
    status: "ACTIVE",
    authorizerName: ctx.app.logicalPrefixedName("authorizer"),
    authorizerFunctionArn: authorizerFn.functionArn,
    signingDisabled: true
  });
  authorizerFn.addPermission("IOTPermission", {
    principal: new ServicePrincipal("iot.amazonaws.com"),
    sourceArn: authorizer.attrArn,
    action: "lambda:InvokeFunction"
  });
  const describeEndpointRole = new Role(ctx.stack, "LambdaRole", {
    assumedBy: new ServicePrincipal("lambda.amazonaws.com")
  });
  describeEndpointRole.addManagedPolicy(
    ManagedPolicy.fromAwsManagedPolicyName(
      "service-role/AWSLambdaBasicExecutionRole"
    )
  );
  describeEndpointRole.addToPolicy(
    new PolicyStatement({
      resources: ["*"],
      actions: ["iot:DescribeEndpoint"]
    })
  );
  const describeEndpointSdkCall = {
    service: "Iot",
    action: "describeEndpoint",
    parameters: {
      endpointType: "iot:Data-ATS"
    },
    region: ctx.stack.region,
    physicalResourceId: PhysicalResourceId.of(
      "IoTEndpointDescription"
    )
  };
  const describeEndpointResource = new AwsCustomResource(
    ctx.stack,
    "Resource",
    {
      onCreate: describeEndpointSdkCall,
      onUpdate: describeEndpointSdkCall,
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE
      }),
      role: describeEndpointRole
    }
  );
  return {
    endpointAddress: describeEndpointResource.getResponseField("endpointAddress")
  };
}
__name(Realtime, "Realtime");

// stacks/connect.ts
import { AnyPrincipal } from "aws-cdk-lib/aws-iam";
import { BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Function as Function3, Bucket as Bucket2, use as use5 } from "sst/constructs";
function Connect({ stack }) {
  const secrets = use5(Secrets);
  const bus = use5(Events);
  const connect = new Function3(stack, "connect", {
    handler: "packages/functions/src/connect.handler",
    permissions: ["sts", "iot"],
    bind: [bus, ...Object.values(secrets.database)]
  });
  connect.grantInvoke(new AnyPrincipal());
  const bucket = new Bucket2(stack, "connect-bucket");
  const template = new BucketDeployment(stack, "connect-template", {
    sources: [
      Source.jsonData("template.json", {
        AWSTemplateFormatVersion: "2010-09-09",
        Description: "Connect your AWS account to access the SST Console. Must be deployed to us-east-1",
        Parameters: {
          workspaceID: {
            Type: "String",
            Description: "This is the ID of your SST Console workspace, do not edit."
          }
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
                      Ref: "workspaceID"
                    }
                  ]
                ]
              },
              AssumeRolePolicyDocument: {
                Version: "2012-10-17",
                Statement: [
                  {
                    Effect: "Allow",
                    Principal: {
                      AWS: stack.account
                    },
                    Action: "sts:AssumeRole",
                    Condition: {
                      StringEquals: {
                        "sts:ExternalId": {
                          Ref: "workspaceID"
                        }
                      }
                    }
                  }
                ]
              },
              ManagedPolicyArns: [
                "arn:aws:iam::aws:policy/AdministratorAccess"
              ]
            }
          },
          SSTConnect: {
            Type: "Custom::SSTConnect",
            Properties: {
              ServiceToken: connect.functionArn,
              accountID: {
                Ref: "AWS::AccountId"
              },
              region: {
                Ref: "AWS::Region"
              },
              role: {
                "Fn::GetAtt": ["SSTRole", "Arn"]
              },
              workspaceID: {
                Ref: "workspaceID"
              }
            }
          }
        },
        Rules: {
          testRegion: {
            Assertions: [
              {
                Assert: {
                  "Fn::Equals": [{ Ref: "AWS::Region" }, "us-east-1"]
                },
                AssertDescription: "This stack needs to be deployed to us-east-1"
              }
            ]
          }
        }
      })
    ],
    destinationBucket: bucket.cdk.bucket,
    accessControl: BucketAccessControl.PUBLIC_READ
  });
  stack.addOutputs({
    connect: connect.functionArn
  });
  return {
    template: bucket.cdk.bucket.urlForObject("template.json")
  };
}
__name(Connect, "Connect");

// stacks/web.ts
import { HttpMethods } from "aws-cdk-lib/aws-s3";
function Web({ stack }) {
  const dns = use6(DNS);
  const api = use6(API);
  const auth = use6(Auth);
  const realtime = use6(Realtime);
  const connect = use6(Connect);
  const workspace = new StaticSite(stack, "workspace", {
    path: "./packages/web/workspace",
    buildOutput: "./dist",
    buildCommand: "pnpm build",
    customDomain: {
      domainName: dns.domain,
      hostedZone: dns.zone.zoneName
    },
    cdk: {
      bucket: {
        cors: [
          {
            allowedMethods: [HttpMethods.GET],
            allowedOrigins: ["*"]
          }
        ]
      }
    },
    environment: {
      VITE_API_URL: api.customDomainUrl || api.url,
      VITE_AUTH_URL: auth.url,
      VITE_IOT_HOST: realtime.endpointAddress,
      VITE_STAGE: stack.stage,
      VITE_CONNECT_URL: connect.template
    }
  });
  stack.addOutputs({
    WorkspaceUrl: workspace.customDomainUrl,
    Output: "1234"
  });
}
__name(Web, "Web");

// stacks/email.ts
import { use as use7 } from "sst/constructs";
import { EmailIdentity, Identity } from "aws-cdk-lib/aws-ses";
import { TxtRecord, MxRecord } from "aws-cdk-lib/aws-route53";
function Email(ctx) {
  if (ctx.stack.stage !== "production")
    return;
  const dns = use7(DNS);
  const email = new EmailIdentity(ctx.stack, "identity", {
    identity: Identity.publicHostedZone(dns.zone)
  });
  new TxtRecord(ctx.stack, "spf-record", {
    recordName: dns.zone.zoneName,
    values: ["v=spf1 include:amazonses.com ~all"],
    zone: dns.zone
  });
  new TxtRecord(ctx.stack, "dmarc-record", {
    recordName: `_dmarc.${dns.zone.zoneName}`,
    zone: dns.zone,
    values: [`v=DMARC1; p=reject; rua=mailto:dmarc@${dns.zone.zoneName};`]
  });
  new MxRecord(ctx.stack, "mx-record", {
    recordName: dns.zone.zoneName,
    zone: dns.zone,
    values: [
      { priority: 1, hostName: "ASPMX.L.GOOGLE.COM." },
      { priority: 5, hostName: "ALT1.ASPMX.L.GOOGLE.COM." },
      { priority: 5, hostName: "ALT2.ASPMX.L.GOOGLE.COM." },
      { priority: 10, hostName: "ALT3.ASPMX.L.GOOGLE.COM." },
      { priority: 10, hostName: "ALT4.ASPMX.L.GOOGLE.COM." }
    ]
  });
  return {
    domain: dns.domain
  };
}
__name(Email, "Email");

// stacks/issues.ts
import {
  PolicyDocument,
  PolicyStatement as PolicyStatement2,
  Role as Role2,
  ServicePrincipal as ServicePrincipal2
} from "aws-cdk-lib/aws-iam";
import {
  KinesisStream,
  use as use8,
  Config as Config2,
  Cron,
  Queue,
  toCdkDuration
} from "sst/constructs";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { StreamMode } from "aws-cdk-lib/aws-kinesis";
import * as actions from "aws-cdk-lib/aws-cloudwatch-actions";

// stacks/alerts.ts
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
function Alerts({ stack }) {
  const alerts = new Topic(stack, "alerts");
  alerts.addSubscription(new EmailSubscription("dax@sst.dev"));
  return alerts;
}
__name(Alerts, "Alerts");

// stacks/issues.ts
function Issues({ stack }) {
  const secrets = use8(Secrets);
  const bus = use8(Events);
  const kinesisStream = new KinesisStream(stack, "issues", {
    consumers: {
      consumer: {
        function: {
          handler: "packages/functions/src/issues/subscriber.handler",
          timeout: "15 minutes",
          nodejs: {
            install: ["source-map"]
          },
          bind: [
            bus,
            use8(Storage),
            ...Object.values(secrets.database),
            secrets.cloudflare
          ],
          permissions: ["sts", "iot"]
        },
        cdk: {
          eventSource: {
            reportBatchItemFailures: true,
            bisectBatchOnError: true,
            startingPosition: StartingPosition.TRIM_HORIZON,
            parallelizationFactor: 10
          }
        }
      }
    },
    cdk: {
      stream: {
        streamMode: StreamMode.ON_DEMAND
      }
    }
  });
  kinesisStream.cdk.stream.metricGetRecordsIteratorAgeMilliseconds().createAlarm(stack, "issues-iterator-age", {
    threshold: 1e3 * 60,
    evaluationPeriods: 3
  }).addAlarmAction(new actions.SnsAction(use8(Alerts)));
  const kinesisRole = new Role2(stack, "issues-subscription", {
    assumedBy: new ServicePrincipal2("logs.amazonaws.com"),
    inlinePolicies: {
      firehose: new PolicyDocument({
        statements: [
          new PolicyStatement2({
            actions: ["kinesis:PutRecord"],
            resources: [kinesisStream.streamArn]
          })
        ]
      })
    }
  });
  kinesisRole.node.defaultChild.addPropertyOverride(
    "AssumeRolePolicyDocument.Statement.0.Principal.Service",
    allRegions().map((region) => `logs.${region}.amazonaws.com`)
  );
  const kinesisParams = Config2.Parameter.create(stack, {
    ISSUES_ROLE_ARN: kinesisRole.roleArn,
    ISSUES_STREAM_ARN: kinesisStream.streamArn
  });
  bus.subscribe(stack, "app.stage.resources_updated", {
    handler: "packages/functions/src/issues/resources-updated.handler",
    timeout: "15 minutes",
    permissions: [
      "sts",
      "logs:DescribeDestinations",
      "logs:PutDestination",
      "logs:PutDestinationPolicy",
      "logs:PutSubscriptionFilter",
      new PolicyStatement2({
        actions: ["iam:PassRole"],
        resources: [kinesisRole.roleArn]
      })
    ],
    bind: [
      bus,
      ...Object.values(secrets.database),
      kinesisParams.ISSUES_ROLE_ARN,
      kinesisParams.ISSUES_STREAM_ARN,
      new Config2.Parameter(stack, "ISSUES_DESTINATION_PREFIX", {
        value: `arn:aws:logs:<region>:${stack.account}:destination:`
      })
    ]
  });
  bus.subscribe(stack, "issue.rate_limited", {
    handler: "packages/functions/src/issues/rate-limited.handler",
    timeout: "1 minute",
    permissions: ["ses", "sts", "logs:DeleteDestination"],
    bind: [bus, ...Object.values(secrets.database)],
    environment: {
      EMAIL_DOMAIN: use8(DNS).domain
    }
  });
  const issueDetectedQueue = new Queue(stack, "issue-detected-queue", {
    consumer: {
      function: {
        handler: "packages/functions/src/issues/issue-detected.queue",
        permissions: ["ses"],
        timeout: "5 minute",
        bind: [...Object.values(secrets.database)],
        environment: {
          EMAIL_DOMAIN: use8(DNS).domain
        }
      }
    },
    cdk: {
      queue: {
        fifo: true,
        visibilityTimeout: toCdkDuration("5 minute")
      }
    }
  });
  bus.subscribe(stack, "issue.detected", {
    handler: "packages/functions/src/issues/issue-detected.handler",
    timeout: "15 minute",
    permissions: ["sts"],
    bind: [...Object.values(secrets.database), issueDetectedQueue]
  });
  bus.subscribe(stack, "app.stage.connected", {
    handler: "packages/functions/src/issues/stage-connected.handler",
    timeout: "1 minute",
    bind: [
      bus,
      use8(Storage),
      ...Object.values(secrets.database),
      kinesisParams.ISSUES_ROLE_ARN,
      kinesisParams.ISSUES_STREAM_ARN
    ],
    permissions: [
      "sts",
      "logs:DescribeDestinations",
      "logs:PutDestination",
      "logs:PutDestinationPolicy",
      new PolicyStatement2({
        actions: ["iam:PassRole"],
        resources: [kinesisRole.roleArn]
      })
    ]
  });
  new Cron(stack, "cleanup", {
    schedule: "cron(0 4 * * ? *)",
    job: {
      function: {
        handler: "packages/functions/src/issues/cleanup.handler",
        timeout: "15 minutes",
        bind: [...Object.values(secrets.database)],
        environment: {
          DRIZZLE_LOG: "true"
        }
      }
    }
  });
}
__name(Issues, "Issues");
function allRegions() {
  return [
    "af-south-1",
    "ap-east-1",
    "ap-northeast-1",
    "ap-northeast-2",
    "ap-northeast-3",
    "ap-south-1",
    "ap-south-2",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-southeast-3",
    "ap-southeast-4",
    "ca-central-1",
    "eu-central-1",
    "eu-central-2",
    "eu-north-1",
    "eu-south-1",
    "eu-south-2",
    "eu-west-1",
    "eu-west-2",
    "eu-west-3",
    "il-central-1",
    "me-central-1",
    "me-south-1",
    "sa-east-1",
    "us-east-1",
    "us-east-2",
    "us-west-1",
    "us-west-2"
  ];
}
__name(allRegions, "allRegions");

// stacks/billing.ts
import { Cron as Cron2, Queue as Queue2, use as use9 } from "sst/constructs";
import { Duration as Duration3 } from "aws-cdk-lib/core";
function Billing({ stack }) {
  const secrets = use9(Secrets);
  const bus = use9(Events);
  const usageQueue = new Queue2(stack, "UsageQueue", {
    cdk: {
      queue: {
        fifo: true,
        visibilityTimeout: Duration3.seconds(180)
      }
    },
    consumer: {
      cdk: {
        eventSource: {
          batchSize: 10
        }
      },
      function: {
        handler: "packages/functions/src/events/fetch-usage.handler",
        bind: [...Object.values(secrets.database), ...secrets.stripe, bus],
        permissions: ["sts", "iot"],
        timeout: "3 minutes"
      }
    }
  });
  new Cron2(stack, "fetch-usage", {
    schedule: "cron(0 5 * * ? *)",
    // 5am UTC
    job: {
      function: {
        handler: "packages/functions/src/billing/cron.handler",
        timeout: "15 minutes",
        url: true,
        permissions: ["sts"],
        bind: [bus, ...Object.values(secrets.database), usageQueue]
      }
    }
  });
}
__name(Billing, "Billing");

// sst.config.ts
var sst_config_default = {
  config(input) {
    return {
      name: "console",
      region: "us-east-1",
      profile: input.stage === "production" ? "sst-production" : "sst-dev"
    };
  },
  stacks(app) {
    if (app.stage !== "production") {
      app.setDefaultRemovalPolicy("destroy");
    }
    app.setDefaultFunctionProps({
      tracing: "disabled",
      architecture: "arm_64"
    });
    app.stack(DNS).stack(Email).stack(Alerts).stack(Storage).stack(Secrets).stack(Auth).stack(Events).stack(Issues).stack(API).stack(Realtime).stack(Connect).stack(Web).stack(Billing);
  }
};
export {
  sst_config_default as default
};
