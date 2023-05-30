import { Navigate, Route, Routes, useParams } from "@solidjs/router";
import {
  ReplicacheProvider,
  createSubscription,
  useReplicache,
} from "../../data/replicache";
import { Connect } from "./connect";
import { CommandBar } from "./command-bar";
import { account } from "$/data/storage";
import { Stage } from "./stage";
import { AppStore } from "$/data/app";
import { Show, createMemo } from "solid-js";
import { StageStore } from "$/data/stage";

export function Workspace() {
  const params = useParams();

  return (
    <ReplicacheProvider accountID={account()} workspaceID={params.workspaceID}>
      <CommandBar>
        <Routes>
          <Route path="connect" component={Connect} />
          <Route path=":appID/:stageID" component={Stage} />
          <Route
            path="*"
            component={() => {
              const apps = createSubscription(AppStore.list, []);
              const appID = createMemo(() => apps()[0]?.id);
              const stages = createSubscription(
                () => StageStore.forApp(appID()),
                []
              );
              const stageID = createMemo(() => stages()[0]?.id);
              return (
                <Show when={appID() && stageID()}>
                  <Navigate href={`${appID()}/${stageID()}`} />
                </Show>
              );
            }}
          />
        </Routes>
      </CommandBar>
    </ReplicacheProvider>
  );
}
