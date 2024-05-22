import type { App } from "@console/core/app";
import { Store } from "./store";
import type { Env } from "@console/core/app/env";
import type { Github } from "@console/core/git/github";
import type { Slack } from "@console/core/slack";
import type { Issue } from "@console/core/issue";
import type { Billing } from "@console/core/billing";
import type { AppRepo } from "@console/core/app/repo";
import type { State } from "@console/core/state";

export const AppStore = new Store()
  .type<App.Info>()
  .scan("all", () => ["app"])
  .get((id: string) => ["app", id])
  .build();

export const AppRepoStore = new Store()
  .type<AppRepo.Info>()
  .scan("all", () => ["appRepo"])
  .get((id: string) => ["appRepo", id])
  .build();

export const EnvStore = new Store()
  .type<Env.Info>()
  .scan("all", () => ["env"])
  .get((id: string) => ["env", id])
  .build();

export const GithubOrgStore = new Store()
  .type<Github.OrgInfo>()
  .scan("all", () => ["githubOrg"])
  .get((id: string) => ["githubOrg", id])
  .build();

export const GithubRepoStore = new Store()
  .type<Github.RepoInfo>()
  .scan("all", () => ["githubRepo"])
  .get((id: string) => ["githubRepo", id])
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

export const StateUpdateStore = new Store()
  .type<State.Update>()
  .scan("forStage", (stageID: string) => ["stateUpdate", stageID])
  .get((stageID: string, updateID: string) => ["stateUpdate", stageID, updateID])
  .build();

export const StateResourceStore = new Store()
  .type<State.Resource>()
  .scan("forStage", (stageID: string) => ["stateResource", stageID])
  .scan("forUpdate", (stageID: string, updateID: string) => [
    "stateResource",
    stageID,
    updateID,
  ])
  .get((stageID: string, updateID: string, resourceID: string) => [
    "stateResource",
    stageID,
    updateID,
    resourceID,
  ])
  .build();
