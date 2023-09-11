import { styled } from "@macaron-css/solid";
import { createSubscription, useReplicache } from "$/providers/replicache";
import { Link, Route, Routes, useNavigate, useParams } from "@solidjs/router";
import { StageStore } from "$/data/stage";
import { AppStore } from "$/data/app";
import { theme } from "$/ui/theme";
import { ComponentProps, JSX, Show } from "solid-js";
import { useCommandBar } from "$/pages/workspace/command-bar";
import {
  IssuesProvider,
  ResourcesProvider,
  StageContext,
  createStageContext,
  useIssuesContext,
  useStageContext,
} from "./context";
import { Logs } from "./logs";
import { Issues } from "./issues";
import { Resources } from "./resources";
import { IconStage } from "$/ui/icons/custom";
import { Header, HeaderProvider } from "../header";
import { Row, SplitOptions, SplitOptionsOption, TabTitle } from "$/ui";

export function Stage() {
  const bar = useCommandBar();
  const rep = useReplicache();
  const nav = useNavigate();
  const params = useParams();

  const app = AppStore.watch.find(
    useReplicache(),
    (app) => app.name === params.appName,
  );
  const stage = createSubscription(() =>
    app()
      ? StageStore.fromName(app()!.id, params.stageName)
      : async () => undefined,
  );

  bar.register("stage-switcher", async () => {
    const stages = await rep().query(StageStore.forApp(app()?.id || ""));
    return stages
      .filter((item) => item.id !== stage()?.id)
      .map((stage) => ({
        icon: IconStage,
        category: "Stage",
        title: `Switch to "${stage.name}"`,
        run: (control) => {
          nav(`/${params.workspaceSlug}/${app()!.name}/${stage.name}`);
          control.hide();
        },
      }));
  });

  const stageContext = createStageContext();

  return (
    <Show when={stageContext.app && stageContext.stage}>
      <StageContext.Provider value={stageContext}>
        <ResourcesProvider>
          <IssuesProvider>
            <Inner />
          </IssuesProvider>
        </ResourcesProvider>
      </StageContext.Provider>
    </Show>
  );
}

export function Inner() {
  const ctx = useStageContext();
  return (
    <HeaderProvider>
      <Header app={ctx.app.name} stage={ctx.stage.name} />
      <div>
        <Routes>
          <Route path="" component={Resources} />
          <Route path="issues/*" component={Issues} />
          <Route path="logs/:resourceID/*" component={Logs} />
        </Routes>
      </div>
    </HeaderProvider>
  );
}
