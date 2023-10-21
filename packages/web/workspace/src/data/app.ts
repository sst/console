import type { App } from "@console/core/app";
import { Store } from "./store";
import { Slack } from "@console/core/slack";
import { Issue } from "@console/core/issue";

export const AppStore = new Store()
  .type<App.Info>()
  .scan("all", () => ["app"])
  .get((id: string) => ["app", id])
  .build();

export const SlackTeamStore = new Store()
  .type<Slack.Info>()
  .scan("all", () => ["slackTeam"])
  .get((id: string) => ["slackTeam", id])
  .build();

export const IssueAlertStore = new Store()
  .type<Issue.Alert.Info>()
  .scan("all", () => ["issueAlert"])
  .get((id: string) => ["issueAlert", id])
  .build();
