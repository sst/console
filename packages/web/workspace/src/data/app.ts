import type { App } from "@console/core/app";
import { Store } from "./store";
import { Github } from "@console/core/github";
import { Slack } from "@console/core/slack";
import { Issue } from "@console/core/issue";
import { Billing } from "@console/core/billing";

export const AppStore = new Store()
  .type<App.Info>()
  .scan("all", () => ["app"])
  .get((id: string) => ["app", id])
  .build();

export const GithubOrgStore = new Store()
  .type<Github.Info>()
  .scan("all", () => ["githubOrg"])
  .get((id: string) => ["githubOrg", id])
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

export const StripeStore = new Store()
  .type<Billing.Stripe.Info>()
  .get(() => ["stripe"])
  .build();
