import type { App } from "@console/core/app";
import { Store } from "./store";
import { Slack } from "@console/core/slack";

export const AppStore = new Store()
  .type<App.Info>()
  .scan("all", () => ["app"])
  .get((id: string) => ["app", id])
  .build();

export const SlackTeam = new Store()
  .type<Slack.Info>()
  .scan("all", () => ["slackTeam"])
  .get((id: string) => ["slackTeam", id])
  .build();
