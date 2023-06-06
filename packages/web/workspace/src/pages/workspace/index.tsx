import { Navigate, Route, Routes, useParams } from "@solidjs/router";
import { ReplicacheProvider, createSubscription } from "$/providers/replicache";
import { Connect } from "./connect";
import { CommandBar } from "./command-bar";
import { account } from "$/data/storage";
import { Stage } from "./stage";
import { AppStore } from "$/data/app";
import { Accessor, Show, createContext, createMemo } from "solid-js";
import { StageStore } from "$/data/stage";
import { WorkspaceStore } from "$/data/workspace";
import { useAuth } from "$/providers/auth";

const WorkspaceContext = createContext<Accessor<WorkspaceStore.Info>>();

export function Workspace() {
  const params = useParams();
  const auth = useAuth();
  const workspace = createSubscription(
    () => WorkspaceStore.fromSlug(params.workspaceSlug),
    undefined,
    () => auth[account()].replicache
  );

  return (
    <Show when={workspace()}>
      <ReplicacheProvider accountID={account()} workspaceID={workspace()!.id}>
        <WorkspaceContext.Provider value={() => workspace()!}>
          <CommandBar>
            <Routes>
              <Route path="connect" component={Connect} />
              <Route path=":appName/:stageName" component={Stage} />
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
                    <Show when={app() && stageName()}>
                      <Navigate href={`${app().name}/${stageName()}`} />
                    </Show>
                  );
                }}
              />
            </Routes>
          </CommandBar>
        </WorkspaceContext.Provider>
      </ReplicacheProvider>
    </Show>
  );
}
