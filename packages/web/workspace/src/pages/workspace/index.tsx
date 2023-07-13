import { Route, Routes, useNavigate, useParams } from "@solidjs/router";
import { ReplicacheProvider, createSubscription } from "$/providers/replicache";
import { Connect } from "./connect";
import { useCommandBar } from "./command-bar";
import { account, setAccount } from "$/data/storage";
import { Stage } from "./stage";
import {
  Accessor,
  Match,
  Show,
  Switch,
  createContext,
  createEffect,
  createMemo,
  useContext,
} from "solid-js";
import { StageStore } from "$/data/stage";
import { WorkspaceStore } from "$/data/workspace";
import { useAuth } from "$/providers/auth";
import { IconSubRight } from "$/ui/icons/custom";
import { UserStore } from "$/data/user";
import {
  IconArrowsRightLeft,
  IconBuildingOffice,
  IconPlus,
  IconUser,
  IconUserPlus,
  IconUsers,
} from "$/ui/icons";
import { Fullscreen, Stack, Text } from "$/ui";
import { Syncing } from "$/ui/loader";
import { User } from "./user";
import { Account } from "./account";
import { Overview } from "./overview";

const WorkspaceContext = createContext<Accessor<WorkspaceStore.Info>>();

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("No workspace context");
  return context;
}

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

  /*
  bar.register("account", async () => {
    return [
      {
        icon: IconSubRight,
        category: "Account",
        title: "Create new workspace",
        run: (control) => {
          nav("/workspace");
          control.hide();
        },
      },
      {
        icon: IconSubRight,
        category: "Account",
        title: "Switch workspaces...",
        run: (control) => {
          control.show("workspace-switcher");
        },
      },
      {
        icon: IconSubRight,
        category: "Account",
        title: "Switch apps...",
        run: (control) => {
          control.show("app-switcher");
        },
      },
    ];
  });
  */
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

  createEffect(() => {
    console.log("workspace", workspace());
  });
  return (
    <Show when={workspace()}>
      <ReplicacheProvider accountID={account()} workspaceID={workspace()!.id}>
        <WorkspaceContext.Provider value={() => workspace()!}>
          <Routes>
            <Route path="connect" component={Connect} />
            <Route path="user" component={User} />
            <Route path="account" component={Account} />
            <Route path=":appName/:stageName/*" component={Stage} />
            <Route path="*" component={Overview} />
          </Routes>
        </WorkspaceContext.Provider>
      </ReplicacheProvider>
    </Show>
  );
}
