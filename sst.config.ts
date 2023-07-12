import { SSTConfig } from "sst";
import { API } from "./stacks/api";
import { Web } from "./stacks/web";
import { Auth } from "./stacks/auth";
import { Secrets } from "./stacks/secrets";
import { Events } from "./stacks/events";
import { DNS } from "./stacks/dns";
import { Realtime } from "./stacks/realtime";
import { Connect } from "./stacks/connect";
import { Email } from "./stacks/email";

export default {
  config(input) {
    return {
      name: "console",
      region: "us-east-1",
      profile: input.stage === "production" ? "sst-production" : "sst-dev",
    };
  },
  stacks(app) {
    if (app.stage !== "production") {
      app.setDefaultRemovalPolicy("destroy");
    }
    app
      .stack(DNS)
      .stack(Email)
      .stack(Secrets)
      .stack(Auth)
      .stack(Events)
      .stack(API)
      .stack(Realtime)
      .stack(Connect)
      .stack(Web);
  },
} satisfies SSTConfig;
