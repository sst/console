import {
  RDS,
  Job,
  Cron,
  Table,
  Queue,
  Topic,
  Script,
  Bucket,
  Cognito,
  AstroSite,
  RemixSite,
  NextjsSite,
  AppSyncApi,
  StackContext,
  WebSocketApi,
  KinesisStream,
  SvelteKitSite,
  SolidStartSite,
  ApiGatewayV1Api,
} from "sst/constructs";

export function Dummy({ stack }: StackContext) {
  new Bucket(stack, "uploads", {
    notifications: {
      myNotification: "packages/functions/src/dummy.handler",
    },
  });

  new Cron(stack, "cronjob", {
    schedule: "rate(1 day)",
    job: "packages/functions/src/dummy.handler",
  });

  new Table(stack, "notes-table", {
    fields: {
      noteId: "string",
    },
    primaryIndex: { partitionKey: "noteId" },
    stream: true,
    consumers: {
      consumer1: "packages/functions/src/dummy.handler",
    },
  });

  new ApiGatewayV1Api(stack, "another-api", {
    routes: {
      "ANY /{proxy+}": "packages/functions/src/dummy.handler",
    },
  });

  new Cognito(stack, "cognito-auth", {
    triggers: {
      preAuthentication: "packages/functions/src/dummy.handler",
    },
  });

  // New

  new Queue(stack, "my-queue", {
    consumer: "packages/functions/src/dummy.handler",
  });

  new Topic(stack, "my-topic", {
    subscribers: {
      subscriber1: "packages/functions/src/dummy.handler",
      subscriber2: "packages/functions/src/dummy.handler",
    },
  });

  new KinesisStream(stack, "my-stream", {
    consumers: {
      consumer1: "packages/functions/src/dummy.handler",
    },
  });

  new Job(stack, "my-job", {
    handler: "packages/functions/src/dummy.handler",
  });

  new Script(stack, "my-script", {
    onDelete: "packages/functions/src/dummy.handler",
  });

  new RDS(stack, "my-rds", {
    engine: "postgresql11.13",
    defaultDatabaseName: "acme",
  });

  new AppSyncApi(stack, "appsync-api", {
    schema: "packages/functions/src/dummy-schema.graphql",
    dataSources: {
      notesDS: "packages/functions/src/dummy.handler",
    },
    resolvers: {
      "Query    listNotes": "notesDS",
      "Query    getNoteById": "notesDS",
      "Mutation createNote": "notesDS",
      "Mutation updateNote": "notesDS",
      "Mutation deleteNote": "notesDS",
    },
  });

  new WebSocketApi(stack, "ws-api", {
    routes: {
      $connect: "packages/functions/src/dummy.handler",
    },
  });
}
