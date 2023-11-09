import {
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "@solidjs/router";
import { ReplicacheProvider, useReplicache } from "$/providers/replicache";
import { NavigationAction, useCommandBar } from "./command-bar";
import { Stage } from "./stage";
import { Match, Show, Switch, createEffect, createMemo } from "solid-js";
import { WorkspaceStore } from "$/data/workspace";
import { useAuth } from "$/providers/auth";
import { IconWrenchScrewdriver } from "$/ui/icons";
import { User } from "./user";
import { Account } from "./account";
import { Settings } from "./settings";
import { Overview } from "./overview";
import { WorkspaceContext } from "./context";
import { AppStore } from "$/data/app";
import {
  IconApp,
  IconUserAdd,
  IconConnect,
  IconSubRight,
} from "$/ui/icons/custom";
import { StageStore } from "$/data/stage";
import { useStorage } from "$/providers/account";
import { NotFound } from "../not-found";
import { Debug } from "../debug";

export function Workspace() {
  const params = useParams();
  const auth = useAuth();
  const storage = useStorage();
  const nav = useNavigate();
  const rep = createMemo(() => auth[storage.value.account].replicache);
  const workspace = WorkspaceStore.list.watch(
    rep,
    () => [],
    (workspaces) =>
      workspaces.find((item) => item.slug === params.workspaceSlug)
  );

  const bar = useCommandBar();

  createEffect(() => {
    if (!workspace.ready) return;
    if (!workspace()) {
      nav("/");
      return;
    }
    console.log("workspace", workspace());
    const id = workspace()?.id;
    if (id) storage.set("workspace", id);
  });

  bar.register("workspace", async () => {
    return [
      NavigationAction({
        title: "Overview",
        category: "Workspace",
        path: `/${workspace()?.slug}`,
        nav,
      }),
      NavigationAction({
        icon: IconUserAdd,
        title: "Invite user to workspace",
        category: "Workspace",
        path: `/${workspace()?.slug}/user`,
        nav,
      }),
      NavigationAction({
        icon: IconConnect,
        title: "Connect an AWS Account",
        category: "Workspace",
        path: `/${workspace()?.slug}/account`,
        nav,
      }),
      NavigationAction({
        icon: IconWrenchScrewdriver,
        title: "Manage workspace settings",
        category: "Workspace",
        path: `/${workspace()?.slug}/settings`,
        nav,
      }),
    ];
  });

  return (
    <Switch>
      <Match when={workspace()}>
        <ReplicacheProvider
          accountID={storage.value.account}
          workspaceID={workspace()!.id}
        >
          <WorkspaceContext.Provider value={() => workspace()!}>
            <Content />
          </WorkspaceContext.Provider>
        </ReplicacheProvider>
      </Match>
    </Switch>
  );
}

export function Content() {
  const bar = useCommandBar();
  const nav = useNavigate();
  const params = useParams();
  const apps = AppStore.all.watch(useReplicache(), () => []);
  const stages = StageStore.list.watch(useReplicache(), () => []);

  bar.register("stage-switcher", async (input, global) => {
    if (!input && global) return [];
    return stages().map((stage) => {
      const app = apps().find((item) => item.id === stage.appID)!;
      return NavigationAction({
        icon: IconApp,
        category: "Stage",
        title: `Go to "${app.name} / ${stage.name}"`,
        path: `/${params.workspaceSlug}/${app.name}/${stage.name}`,
        prefix: true,
        nav,
      });
    });
  });
  return (
    <Routes>
      <Route path="user" component={User} />
      <Route path="account" component={Account} />
      <Route path="settings" component={Settings} />
      <Route path="debug" component={Debug} />
      <Route path=":appName/:stageName/*" component={Stage} />
      <Route path="" component={Overview} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
