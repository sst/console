import { App, Stage } from "@console/core/app";
import { Resource } from "@console/core/app/resource";
import { AWS } from "@console/core/aws";
import { Issue } from "@console/core/issue";
import { User } from "@console/core/user";
import { Warning } from "@console/core/warning";
import { Workspace } from "@console/core/workspace";
import { DateTime } from "luxon";

const DEFAULT_APP_ID = "1";
const FAILED_ACCOUNT_ID = "123456789015";
const SYNCING_ACCOUNT_ID = "123456789016";

export type DummyConfig = "empty" | "overview:default";

type DummyData =
  | (Workspace.Info & { _type: "workspace" })
  | (Omit<AWS.Account.Info, "workspaceID"> & { _type: "awsAccount" })
  | (Omit<User.Info, "workspaceID"> & { _type: "user" })
  | (Omit<Resource.Info, "workspaceID"> & { _type: "resource" })
  | (Omit<Stage.Info, "workspaceID"> & { _type: "stage" })
  | (Omit<App.Info, "workspaceID"> & { _type: "app" })
  | (Omit<Issue.Info, "workspaceID"> & { _type: "issue" })
  | (Omit<Warning.Info, "workspaceID"> & { _type: "warning" });

function stage(
  id: string,
  name: string,
  appID: string,
  region: string,
  awsAccountID: string,
): DummyData {
  return {
    _type: "stage",
    id,
    name,
    appID,
    region,
    awsAccountID,
    timeCreated: DateTime.now().toSQL()!,
    timeDeleted: DateTime.now().toSQL()!,
    timeUpdated: DateTime.now().toSQL()!,
  };
}

function app(id: string, name: string): DummyData {
  return {
    _type: "app",
    id,
    name,
    timeCreated: DateTime.now().toSQL()!,
    timeDeleted: DateTime.now().toSQL()!,
    timeUpdated: DateTime.now().toSQL()!,
  };
}

export function* generateData(
  config: DummyConfig,
): Generator<DummyData, void, unknown> {
  yield {
    _type: "workspace",
    id: "dummy-workspace",
    slug: "dummy-workspace",
    timeCreated: DateTime.now().toSQL()!,
    timeDeleted: DateTime.now().toSQL()!,
    timeUpdated: DateTime.now().toSQL()!,
    stripeSubscriptionItemID: null,
    stripeCustomerID: null,
    stripeSubscriptionID: null,
  };

  yield {
    _type: "user",
    timeCreated: DateTime.now().toSQL()!,
    timeUpdated: DateTime.now().toSQL()!,
    timeSeen: DateTime.now().toSQL()!,
    id: "dummy-user",
    email: "dummy@example.com",
    timeDeleted: null,
  };

  if (config === "overview:default") yield* overviewDefault();
}

export function* overviewDefault(): Generator<DummyData, void, unknown> {
  yield app(DEFAULT_APP_ID, "my-sst-app");
  yield {
    _type: "awsAccount",
    id: "syncing-empty",
    accountID: "123456789012",
    timeUpdated: DateTime.now().toSQL()!,
    timeCreated: DateTime.now().toSQL()!,
    timeDiscovered: null,
    timeDeleted: null,
    timeFailed: null,
  };
  yield {
    _type: "awsAccount",
    id: "failed-empty",
    accountID: "123456789013",
    timeUpdated: DateTime.now().toSQL()!,
    timeCreated: DateTime.now().toSQL()!,
    timeDiscovered: DateTime.now().toSQL()!,
    timeFailed: DateTime.now().toSQL()!,
    timeDeleted: null,
  };
  yield {
    _type: "awsAccount",
    id: "empty",
    accountID: "123456789014",
    timeUpdated: DateTime.now().toSQL()!,
    timeCreated: DateTime.now().toSQL()!,
    timeDiscovered: DateTime.now().toSQL()!,
    timeFailed: null,
    timeDeleted: null,
  };
  yield {
    _type: "awsAccount",
    id: "failed",
    accountID: FAILED_ACCOUNT_ID,
    timeUpdated: DateTime.now().toSQL()!,
    timeCreated: DateTime.now().toSQL()!,
    timeDiscovered: DateTime.now().toSQL()!,
    timeFailed: DateTime.now().toSQL()!,
    timeDeleted: null,
  };
  yield stage(
    "stage-account-failed",
    "pr-123",
    DEFAULT_APP_ID,
    "ap-southeast-1",
    "failed",
  );
  yield {
    _type: "awsAccount",
    id: "syncing",
    accountID: SYNCING_ACCOUNT_ID,
    timeUpdated: DateTime.now().toSQL()!,
    timeCreated: DateTime.now().toSQL()!,
    timeDiscovered: null,
    timeDeleted: null,
    timeFailed: null,
  };
  yield stage(
    "stage-account-syncing",
    "dev",
    DEFAULT_APP_ID,
    "us-east-1",
    SYNCING_ACCOUNT_ID,
  );
}
