import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "@solidjs/router";
import { ReplicacheProvider, createSubscription } from "$/providers/replicache";
import { Connect } from "./connect";
import { useCommandBar } from "./command-bar";
import { account, setAccount } from "$/data/storage";
import { Stage } from "./stage";
import { AppStore } from "$/data/app";
import {
  Accessor,
  Match,
  Show,
  Switch,
  createContext,
  createMemo,
  useContext,
} from "solid-js";
import { StageStore } from "$/data/stage";
import { WorkspaceStore } from "$/data/workspace";
import { useAuth } from "$/providers/auth";
import { IconSubRight } from "$/ui/icons/custom";
import { UserStore } from "$/data/user";
import { IconBuildingOffice } from "$/ui/icons";
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
  const workspace = createSubscription(
    () => WorkspaceStore.fromSlug(params.workspaceSlug),
    undefined,
    () => auth[account()].replicache
  );

  const bar = useCommandBar();

  bar.register("account", async () => {
    return [
      {
        icon: IconSubRight,
        category: "Account",
        title: "Create new workspace",
        run: (control) => {
          nav("/auth/workspace");
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
  bar.register("workspace", async () => {
    return [
      {
        icon: IconSubRight,
        title: "Add user to workspace",
        category: "Workspace",
        run: (control) => {
          control.hide();
          nav(`/${workspace()?.slug}/user`);
        },
      },
      {
        icon: IconSubRight,
        title: "Connect an AWS Account",
        category: "Workspace",
        run: (control) => {
          control.hide();
          nav(`/${workspace()?.slug}/account`);
        },
      },
    ];
  });

  bar.register("workspace-switcher", async () => {
    const workspaces = await Promise.all(
      Object.values(auth).map(async (account) => {
        const workspaces = await account.replicache.query(async (tx) => {
          const users = await UserStore.list()(tx);
          return Promise.all(
            users.map(async (user) => {
              const workspace = await WorkspaceStore.fromID(user.workspaceID)(
                tx
              );
              return { account: account, workspace };
            })
          );
        });
        return workspaces;
      })
    ).then((x) => x.flat());
    const splits = location.pathname.split("/");
    return workspaces
      .filter((w) => w.workspace?.slug !== splits[1])
      .map((w) => ({
        title: `Switch to ${w.workspace?.slug} workspace`,
        category: "Workspace",
        icon: IconBuildingOffice,
        run: (control) => {
          setAccount(w.account.token.accountID);
          nav(`/${w.workspace.slug}`);
          control.hide();
        },
      }));
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
