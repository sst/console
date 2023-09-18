import { App, Stage } from "@console/core/app";
import { Resource } from "@console/core/app/resource";
import { AWS } from "@console/core/aws";
import { Issue } from "@console/core/issue";
import { User } from "@console/core/user";
import { Workspace } from "@console/core/workspace";
import { DateTime } from "luxon";

export type DummyConfig = "base" | "example";
type DummyData =
  | (Workspace.Info & { type: "workspace" })
  | (Omit<AWS.Account.Info, "workspaceID"> & { type: "awsAccount" })
  | (Omit<User.Info, "workspaceID"> & { type: "user" })
  | (Omit<Resource.Info, "workspaceID"> & { type: "resource" })
  | (Omit<Stage.Info, "workspaceID"> & { type: "stage" })
  | (Omit<App.Info, "workspaceID"> & { type: "app" })
  | (Omit<Issue.Info, "workspaceID"> & { type: "issue" });

export function* generateData(
  config: DummyConfig,
): Generator<DummyData, void, unknown> {
  console.log("CONFIG", config);
  yield {
    type: "workspace",
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
    type: "user",
    timeCreated: DateTime.now().toSQL()!,
    timeUpdated: DateTime.now().toSQL()!,
    timeSeen: DateTime.now().toSQL()!,
    id: "dummy-user",
    email: "dummy@example.com",
    timeDeleted: null,
  };

  yield {
    type: "awsAccount",
    id: "syncing",
    accountID: "123456789012",
    timeUpdated: DateTime.now().toSQL()!,
    timeCreated: DateTime.now().toSQL()!,
    timeDiscovered: null,
    timeDeleted: null,
    timeFailed: null,
  };

  if (config === "example")
    yield {
      type: "awsAccount",
      id: "failed",
      accountID: "123456789012",
      timeUpdated: DateTime.now().toSQL()!,
      timeCreated: DateTime.now().toSQL()!,
      timeDiscovered: DateTime.now().toSQL()!,
      timeFailed: DateTime.now().toSQL()!,
      timeDeleted: null,
    };
}
