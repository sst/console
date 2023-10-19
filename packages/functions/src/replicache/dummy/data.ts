import { DateTime } from "luxon";
import { AWS } from "@console/core/aws";
import { User } from "@console/core/user";
import { Issue } from "@console/core/issue";
import { App, Stage } from "@console/core/app";
import { Warning } from "@console/core/warning";
import type { Usage } from "@console/core/billing";
import { Workspace } from "@console/core/workspace";
import { Resource } from "@console/core/app/resource";

const USER_ID = "me@example.com";

const APP_ID = "1";
const APP_ID_LONG = "2";
const APP_LOCAL = "dummy";

const STAGE_LOCAL = "dummy";

const ACCOUNT_ID = "connected";
const ACCOUNT_ID_LONG = "long";
const ACCOUNT_ID_FAILED = "failed";
const ACCOUNT_ID_SYNCING = "syncing";
const ACCOUNT_ID_SYNCING_FULL = "syncing-full";

const timestamps = {
  timeCreated: DateTime.now().startOf("day").toSQL()!,
  timeUpdated: DateTime.now().startOf("day").toSQL()!,
};

export type DummyMode =
  | "empty"
  | "overview:base"
  | "overview:all;usage:overage;subscription:active";

export interface DummyConfig {
  local: {
    app: string;
    stage: string;
  };
  user: string;
}

type DummyData =
  | (DummyConfig & {
      _type: "dummyConfig";
    })
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

interface WorkspaceProps {
  id: string;
  activeSubscription?: boolean;
}
function workspace({ id, activeSubscription }: WorkspaceProps): DummyData {
  return {
    _type: "workspace",
    id,
    slug: id,
    timeDeleted: null,
    stripeSubscriptionItemID: null,
    stripeCustomerID: null,
    stripeSubscriptionID: activeSubscription ? "sub_123" : null,
    ...timestamps,
  };
}

interface UserProps {
  id?: string;
  email: string;
  active?: boolean;
  deleted?: boolean;
}
function user({ id, email, active, deleted }: UserProps): DummyData {
  return {
    _type: "user",
    email,
    id: id || email,
    timeSeen: active ? timestamps.timeUpdated : null,
    timeDeleted: deleted ? timestamps.timeUpdated : null,
    ...timestamps,
  };
}

interface AccountProps {
  id: string;
  failed?: boolean;
  accountID: string;
  syncing?: boolean;
}
function account({ id, accountID, failed, syncing }: AccountProps): DummyData {
  return {
    _type: "awsAccount",
    id,
    accountID: accountID,
    timeDeleted: null,
    timeFailed: failed ? timestamps.timeUpdated : null,
    timeDiscovered: syncing ? null : timestamps.timeUpdated,
    ...timestamps,
  };
}

interface StageProps {
  id: string;
  appID: string;
  region?: string;
  awsAccountID: string;
}
function stage({ id, appID, region, awsAccountID }: StageProps): DummyData {
  return {
    _type: "stage",
    id,
    appID,
    name: id,
    awsAccountID,
    timeDeleted: null,
    region: region || "us-east-1",
    ...timestamps,
  };
}

interface AppProps {
  id: string;
  name?: string;
}
function app({ id, name }: AppProps): DummyData {
  return {
    _type: "app",
    id,
    name: name || id,
    timeDeleted: null,
    ...timestamps,
  };
}

interface UsageProps {
  day: string;
  invocations: number;
}
function usage({ day, invocations }: UsageProps): DummyData {
  return {
    _type: "usage",
    day,
    id: day,
    invocations,
    stageID: "stage-account-overage",
    timeDeleted: null,
    ...timestamps,
  };
}

export function* generateData(
  mode: DummyMode
): Generator<DummyData, void, unknown> {
  console.log("generating for", mode);

  const modeMap = stringToObject(mode);

  yield workspace({
    id: "dummy-workspace",
    activeSubscription: modeMap["subscription"] === "active",
  });

  yield {
    _type: "dummyConfig",
    user: USER_ID,
    local: {
      app: APP_LOCAL,
      stage: STAGE_LOCAL,
    },
  };

  yield user({ email: USER_ID, active: true });
  yield user({ email: "invited-dummy@example.com" });
  yield user({ email: "invited-dummy-with-long-email-address@example.com" });
  yield user({
    email: "deleted-dummy@example.com",
    active: true,
    deleted: true,
  });

  yield usage({ day: "2021-01-01", invocations: 100 });

  if (modeMap["overview"] === "full") {
    for (let i = 0; i < 30; i++) {
      yield user({ email: `dummy${i}@example.com`, active: true });
    }
  }

  if (modeMap["overview"]) yield* overviewBase();

  if (modeMap["overview"] === "full") yield* overviewFull();

  if (modeMap["usage"] === "overage")
    yield usage({ day: "2021-01-01", invocations: 12300000000 });
}

function* overviewBase(): Generator<DummyData, void, unknown> {
  yield account({ id: ACCOUNT_ID_LONG, accountID: "123456789012" });
  yield app({ id: APP_LOCAL });
  yield app({
    id: APP_ID_LONG,
    name: "my-sst-app-that-has-a-really-long-name-that-should-be-truncated",
  });
  yield stage({
    id: STAGE_LOCAL,
    appID: APP_LOCAL,
    awsAccountID: ACCOUNT_ID_LONG,
  });
  yield stage({
    id: "stage-long-id-1",
    appID: APP_ID_LONG,
    awsAccountID: ACCOUNT_ID_LONG,
  });
  yield stage({
    id: "this-stage-name-is-really-long-and-needs-to-be-truncated",
    appID: APP_ID_LONG,
    region: "ap-southeast-1",
    awsAccountID: ACCOUNT_ID_LONG,
  });
}

function* overviewFull(): Generator<DummyData, void, unknown> {
  yield app({ id: APP_ID, name: "my-sst-app" });
  yield account({
    id: "syncing-empty",
    accountID: "123456789013",
    syncing: true,
  });
  yield account({
    id: "failed-empty",
    accountID: "123456789014",
    failed: true,
  });
  yield account({ id: "empty", accountID: "123456789015" });
  yield account({
    id: ACCOUNT_ID_FAILED,
    accountID: "123456789016",
    failed: true,
  });
  yield stage({
    id: "stage-account-failed",
    appID: APP_ID,
    region: "ap-southeast-1",
    awsAccountID: ACCOUNT_ID_FAILED,
  });
  yield account({
    id: ACCOUNT_ID_SYNCING,
    accountID: "123456789017",
    syncing: true,
  });
  yield account({
    id: ACCOUNT_ID_SYNCING_FULL,
    accountID: "123456789019",
    syncing: true,
  });
  yield stage({
    id: "stage-account-syncing",
    appID: APP_ID,
    awsAccountID: ACCOUNT_ID_SYNCING,
  });
  yield account({ id: ACCOUNT_ID, accountID: "123456789018" });

  for (let i = 0; i < 30; i++) {
    yield stage({ id: `stage-${i}`, appID: APP_ID, awsAccountID: ACCOUNT_ID });
  }

  for (let i = 0; i < 10; i++) {
    yield stage({
      id: `stage-${i}`,
      appID: APP_ID,
      awsAccountID: ACCOUNT_ID_SYNCING_FULL,
    });
  }
}
