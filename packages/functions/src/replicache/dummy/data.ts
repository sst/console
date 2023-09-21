import { DateTime } from "luxon";
import { AWS } from "@console/core/aws";
import { User } from "@console/core/user";
import { Issue } from "@console/core/issue";
import { App, Stage } from "@console/core/app";
import { Warning } from "@console/core/warning";
import type { Usage } from "@console/core/billing";
import { Workspace } from "@console/core/workspace";
import { Resource } from "@console/core/app/resource";

const APP_ID = "1";
const APP_ID_LONG = "2";
const ACCOUNT_ID = "connected";
const ACCOUNT_ID_LONG = "long";
const ACCOUNT_ID_FAILED = "failed";
const ACCOUNT_ID_SYNCING = "syncing";

export type DummyConfig =
  | "empty"
  | "overview:base"
  | "overview:all;usage:overage;subscription:active";

type DummyData =
  | (Workspace.Info & { _type: "workspace" })
  | (Omit<Usage, "workspaceID"> & { _type: "usage" })
  | (Omit<App.Info, "workspaceID"> & { _type: "app" })
  | (Omit<User.Info, "workspaceID"> & { _type: "user" })
  | (Omit<Stage.Info, "workspaceID"> & { _type: "stage" })
  | (Omit<Issue.Info, "workspaceID"> & { _type: "issue" })
  | (Omit<Warning.Info, "workspaceID"> & { _type: "warning" })
  | (Omit<Resource.Info, "workspaceID"> & { _type: "resource" })
  | (Omit<AWS.Account.Info, "workspaceID"> & { _type: "awsAccount" });

function stringToObject(input: string): { [key: string]: string } {
  const result: { [key: string]: string } = {};

  const pairs = input.split(";");
  for (let pair of pairs) {
    const [key, value] = pair.split(":");
    if (key && value) {
      result[key.trim()] = value.trim();
    }
  }

  return result;
}

function workspace(id: string, activeSubscription?: boolean): DummyData {
  return {
    _type: "workspace",
    id,
    slug: id,
    timeCreated: DateTime.now().toSQL()!,
    timeDeleted: null,
    timeUpdated: DateTime.now().toSQL()!,
    stripeSubscriptionItemID: null,
    stripeCustomerID: null,
    stripeSubscriptionID: activeSubscription ? "sub_123" : null,
  };
}

function user(email: string, active?: boolean, deleted?: boolean): DummyData {
  return {
    _type: "user",
    email,
    id: email,
    timeCreated: DateTime.now().toSQL()!,
    timeUpdated: DateTime.now().toSQL()!,
    timeSeen: active ? DateTime.now().toSQL()! : null,
    timeDeleted: deleted ? DateTime.now().toSQL()! : null,
  };
}

function account(
  id: string,
  accountID: string,
  failed?: boolean,
  discovered?: boolean
): DummyData {
  return {
    _type: "awsAccount",
    id,
    accountID,
    timeUpdated: DateTime.now().toSQL()!,
    timeCreated: DateTime.now().toSQL()!,
    timeDiscovered: discovered ? DateTime.now().toSQL()! : null,
    timeFailed: failed ? DateTime.now().toSQL()! : null,
    timeDeleted: null,
  };
}

function stage(
  id: string,
  appID: string,
  region: string,
  awsAccountID: string
): DummyData {
  return {
    _type: "stage",
    id,
    appID,
    region,
    name: id,
    awsAccountID,
    timeDeleted: null,
    timeCreated: DateTime.now().toSQL()!,
    timeUpdated: DateTime.now().toSQL()!,
  };
}

function app(id: string, name: string): DummyData {
  return {
    _type: "app",
    id,
    name,
    timeDeleted: null,
    timeCreated: DateTime.now().toSQL()!,
    timeUpdated: DateTime.now().toSQL()!,
  };
}

export function* generateData(
  config: DummyConfig
): Generator<DummyData, void, unknown> {
  const configMap = stringToObject(config);

  yield workspace("dummy-workspace", configMap["subscription"] === "active");

  yield user("me@example.com", true, false);
  yield user("invited-dummy@example.com", false, false);
  yield user("deleted-dummy@example.com", true, true);

  if (configMap["overview"] === "full") {
    for (let i = 0; i < 30; i++) {
      yield user(`dummy${i}@example.com`, true, false);
    }
  }

  if (configMap["overview"]) yield* overviewBase();

  if (configMap["overview"] === "full") yield* overviewFull();

  if (configMap["usage"] === "overage") yield* usageOverage();
}

function* overviewBase(): Generator<DummyData, void, unknown> {
  yield account(ACCOUNT_ID_LONG, "123456789018", false, true);
  yield app(
    APP_ID_LONG,
    "my-sst-app-that-has-a-really-long-name-that-should-be-truncated"
  );
  yield stage("stage-long-id-1", APP_ID_LONG, "us-east-1", ACCOUNT_ID_LONG);
  yield stage(
    "this-stage-name-is-really-long-and-needs-to-be-truncated",
    APP_ID_LONG,
    "ap-southeast-1",
    ACCOUNT_ID_LONG
  );
}

function* overviewFull(): Generator<DummyData, void, unknown> {
  yield app(APP_ID, "my-sst-app");
  yield account("syncing-empty", "123456789012", false, false);
  yield account("failed-empty", "123456789013", true, true);
  yield account("empty", "123456789014", false, true);
  yield account(ACCOUNT_ID_FAILED, "123456789015", true, true);
  yield stage(
    "stage-account-failed",
    APP_ID,
    "ap-southeast-1",
    ACCOUNT_ID_FAILED
  );
  yield account(ACCOUNT_ID_SYNCING, "123456789016", false, false);
  yield stage("stage-account-syncing", APP_ID, "us-east-1", ACCOUNT_ID_SYNCING);
  yield account(ACCOUNT_ID, "123456789017", false, true);

  for (let i = 0; i < 30; i++) {
    yield stage(`stage-${i}`, APP_ID, "us-east-1", ACCOUNT_ID);
  }
}

function* usageOverage(): Generator<DummyData, void, unknown> {
  yield {
    _type: "usage",
    id: "1",
    day: "2021-01-01",
    stageID: "stage-account-overage",
    invocations: 100,
    timeCreated: DateTime.now().toSQL()!,
    timeDeleted: null,
    timeUpdated: DateTime.now().toSQL()!,
  };
  yield {
    _type: "usage",
    id: "2",
    day: "2021-01-02",
    stageID: "stage-account-overage",
    invocations: 1230000,
    timeCreated: DateTime.now().toSQL()!,
    timeDeleted: null,
    timeUpdated: DateTime.now().toSQL()!,
  };
}

function* stagesLarge(): Generator<DummyData, void, unknown> {}
