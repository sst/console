import type { App } from "@console/core/app";
import type { Stage } from "@console/core/app/stage";
import type { Account } from "@console/core/aws/account";
import type { Usage } from "@console/core/billing";

const WORKSPACE_ID = "1";
const longAccountID = "983456789012";
const emptyAccountID = "883456789012";
const defaultAccountID = "123456789012";
const disconnectedAccountID = "223456789012";
const disconnectedEmptyAccountID = "333456789012";
const localAppName = "other-sst-app";
const localStageName =
  "thestagenameisreallylonganditwillcausethelinetooverflow";

function account(id: string, failed?: boolean): Account.Info {
  return {
    id,
    accountID: id,
    workspaceID: WORKSPACE_ID,
    timeCreated: new Date().toISOString(),
    timeDeleted: new Date().toISOString(),
    timeDiscovered: null,
    timeFailed: failed ? new Date().toISOString() : null,
    timeUpdated: new Date().toISOString(),
  };
}

function stage(
  id: string,
  name: string,
  appID: string,
  region: string,
  awsAccountID: string
): Stage.Info {
  return {
    id,
    name,
    appID,
    region,
    workspaceID: WORKSPACE_ID,
    awsAccountID,
    timeCreated: new Date().toISOString(),
    timeDeleted: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
  };
}

function app(id: string, name: string): App.Info {
  return {
    id,
    name,
    timeCreated: new Date().toISOString(),
    timeDeleted: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
  };
}

function usage(day: string, invocations: number): Usage {
  return {
    id: Date.now().toString(),
    stageID: localStageName,
    day,
    invocations,
    workspaceID: WORKSPACE_ID,
    timeCreated: new Date().toISOString(),
    timeDeleted: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
  };
}

const EMPTY: Account.Info[] = [];
const DEFAULT = [
  account(defaultAccountID),
  account(longAccountID),
  account(emptyAccountID),
  account(disconnectedAccountID, true),
  account(disconnectedEmptyAccountID, true),
];
export const DUMMY_ACCOUNTS = {
  EMPTY,
  DEFAULT,
};
export const DUMMY_STAGES = [
  stage("1", "dev", "1", "us-east-1", defaultAccountID),
  stage("2", "pr-123", "1", "us-east-1", disconnectedAccountID),
  stage("2", localStageName, "2", "ap-southeast-1", longAccountID),
  stage("3", "dev", "3", "us-east-1", longAccountID),
];
interface AppMap {
  [key: string]: App.Info;
}
export const DUMMY_APP_STORE: AppMap = {
  "1": app("1", "my-sst-app"),
  "2": app("2", localAppName),
  "3": app(
    "3",
    "my-sst-app-that-has-a-really-long-name-that-should-be-truncated"
  ),
};
export const DUMMY_LOCAL_APP = {
  app: localAppName,
  stage: localStageName,
};

export const DUMMY_USAGES = [
  usage("2021-01-01", 123),
  usage("2021-01-02", 234),
];
