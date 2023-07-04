import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "@solidjs/router";
import {
  ReplicacheProvider,
  createSubscription,
  useReplicache,
} from "$/providers/replicache";
import { Connect } from "./connect";
import { CommandBar, useCommandBar } from "./command-bar";
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
} from "solid-js";
import { StageStore } from "$/data/stage";
import { WorkspaceStore } from "$/data/workspace";
import { useAuth } from "$/providers/auth";
import { IconApp, IconSubRight } from "$/ui/icons/custom";
import { UserStore } from "$/data/user";
import { IconBuildingOffice } from "$/ui/icons";
import { Fullscreen, Stack, Text } from "$/ui";
import { Syncing } from "$/ui/loader";

const WorkspaceContext = createContext<Accessor<WorkspaceStore.Info>>();

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
        title: "Switch workspaces...",
        run: (control) => {
          control.show("workspace");
        },
      },
      {
        icon: IconSubRight,
        category: "Account",
        title: "Switch apps...",
        run: (control) => {
          control.show("app");
        },
      },
    ];
  });

  bar.register("workspace", async () => {
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
            <Route path=":appName/:stageName/*" component={Stage} />
            <Route
              path="*"
              component={() => {
                const apps = createSubscription(AppStore.list, []);
                const app = createMemo(() => apps()[0]);
                const stages = createSubscription(
                  () => StageStore.forApp(app()?.id),
                  []
                );
                const stageName = createMemo(() => stages()[0]?.name);
                return (
                  <Switch>
                    <Match when={!apps().length}>
                      <Fullscreen>
                        <Syncing>Run `sst connect` in your app</Syncing>
                      </Fullscreen>
                    </Match>
                    <Match when={app() && stageName()}>
                      <Navigate href={`${app().name}/${stageName()}`} />
                    </Match>
                  </Switch>
                );
              }}
            />
          </Routes>
        </WorkspaceContext.Provider>
      </ReplicacheProvider>
    </Show>
  );
}
