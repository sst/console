import { App, Stage } from "@console/core/app";
import { Resource } from "@console/core/app/resource";
import { AWS } from "@console/core/aws";
import { Issue } from "@console/core/issue";
import { User } from "@console/core/user";
import { Warning } from "@console/core/warning";
import { Workspace } from "@console/core/workspace";
import { DateTime } from "luxon";

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

export function* generateData(
  config: DummyConfig
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

  yield {
    _type: "awsAccount",
    id: "syncing",
    accountID: "123456789012",
    timeUpdated: DateTime.now().toSQL()!,
    timeCreated: DateTime.now().toSQL()!,
    timeDiscovered: null,
    timeDeleted: null,
    timeFailed: null,
  };

  if (config === "overview:default") yield* example();
}

export function* example(): Generator<DummyData, void, unknown> {
  yield {
    _type: "awsAccount",
    id: "syncing",
    accountID: "123456789012",
    timeUpdated: DateTime.now().toSQL()!,
    timeCreated: DateTime.now().toSQL()!,
    timeDiscovered: null,
    timeDeleted: null,
    timeFailed: null,
  };
  yield {
    _type: "awsAccount",
    id: "failed",
    accountID: "123456789013",
    timeUpdated: DateTime.now().toSQL()!,
    timeCreated: DateTime.now().toSQL()!,
    timeDiscovered: DateTime.now().toSQL()!,
    timeFailed: DateTime.now().toSQL()!,
    timeDeleted: null,
  };
}
