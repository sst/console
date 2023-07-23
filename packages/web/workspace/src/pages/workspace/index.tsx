import { Route, Routes, useNavigate, useParams } from "@solidjs/router";
import {
  ReplicacheProvider,
  createSubscription,
  useReplicache,
} from "$/providers/replicache";
import { Connect } from "./connect";
import { useCommandBar } from "./command-bar";
import { account } from "$/data/storage";
import { Stage } from "./stage";
import {
  Accessor,
  Show,
  createContext,
  createMemo,
  useContext,
} from "solid-js";
import { WorkspaceStore } from "$/data/workspace";
import { useAuth } from "$/providers/auth";
import { IconArrowsRightLeft, IconUserPlus } from "$/ui/icons";
import { User } from "./user";
import { Account } from "./account";
import { Overview } from "./overview";
import { WorkspaceContext } from "./context";
import { AppStore } from "$/data/app";
import { IconApp } from "$/ui/icons/custom";
import { StageStore } from "$/data/stage";

export function Workspace() {
  const params = useParams();
  const auth = useAuth();
  const nav = useNavigate();
  const rep = createMemo(() => auth[account()].replicache);
  const workspace = createSubscription(
    () => WorkspaceStore.fromSlug(params.workspaceSlug),
    undefined,
    rep
  );

  const bar = useCommandBar();

  bar.register("workspace", async () => {
    return [
      {
        icon: IconUserPlus,
        title: "Add user to workspace",
        category: "Workspace",
        run: (control) => {
          control.hide();
          nav(`/${workspace()?.slug}/user`);
        },
      },
      {
        icon: IconArrowsRightLeft,
        title: "Connect an AWS Account",
        category: "Workspace",
        run: (control) => {
          control.hide();
          nav(`/${workspace()?.slug}/account`);
        },
      },
    ];
  });

  return (
    <Show when={workspace()}>
      <ReplicacheProvider accountID={account()} workspaceID={workspace()!.id}>
        <WorkspaceContext.Provider value={() => workspace()!}>
          <Content />
        </WorkspaceContext.Provider>
      </ReplicacheProvider>
    </Show>
  );
}

export function Content() {
  const bar = useCommandBar();
  const rep = useReplicache();
  const nav = useNavigate();
  const params = useParams();
  bar.register("app-switcher", async () => {
    const apps = await rep().query(AppStore.list());
    return apps.map((app) => ({
      icon: IconApp,
      category: "App",
      title: `Switch to "${app.name}" app`,
      run: async (control) => {
        const stages = await rep().query(StageStore.forApp(app.id));
        nav(`/${params.workspaceSlug}/${app.name}/${stages[0].name}`);
        control.hide();
      },
    }));
  });
  return (
    <Routes>
      <Route path="connect" component={Connect} />
      <Route path="user" component={User} />
      <Route path="account" component={Account} />
      <Route path=":appName/:stageName/*" component={Stage} />
      <Route path="*" component={Overview} />
    </Routes>
  );
}
