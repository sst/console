import { styled } from "@macaron-css/solid";
import { createSubscription, useReplicache } from "$/providers/replicache";
import { Route, Routes, useNavigate, useParams } from "@solidjs/router";
import { StageStore } from "$/data/stage";
import { AppStore } from "$/data/app";
import { theme } from "$/ui/theme";
import { utility } from "$/ui/utility";
import { Show, createEffect } from "solid-js";
import { useCommandBar } from "$/pages/workspace/command-bar";
import { ResourcesProvider, StageContext, createStageContext } from "./context";
import { Resources } from "./resources";
import { Logs } from "./logs";
import { IconApp, IconStage } from "$/ui/icons/custom";
import { useWorkspace } from "../context";
import { Header } from "../header";

const Content = styled("div", {
  base: {
    padding: theme.space[4],
    ...utility.stack(4),
  },
});

export function Stage() {
  const bar = useCommandBar();
  const rep = useReplicache();
  const nav = useNavigate();
  const params = useParams();

  const app = AppStore.watch.find(
    useReplicache(),
    (app) => app.name === params.appName
  );
  const stage = createSubscription(() =>
    app()
      ? StageStore.fromName(app()!.id, params.stageName)
      : async () => undefined
  );

  bar.register("stage-switcher", async () => {
    const stages = await rep().query(StageStore.forApp(app()?.id || ""));
    return stages
      .filter((item) => item.id !== stage()?.id)
      .map((stage) => ({
        icon: IconStage,
        category: "Stage",
        title: `Switch to "${stage.name}" stage`,
        run: (control) => {
          nav(`/${params.workspaceSlug}/${app()!.name}/${stage.name}`);
          control.hide();
        },
      }));
  });

  createEffect(() => console.log({ ...params }));

  const stageContext = createStageContext();

  return (
    <Show when={stageContext.app && stageContext.stage}>
      <StageContext.Provider value={stageContext}>
        <ResourcesProvider>
          <Header app={app()?.name} stage={stage()?.name} />
          <Content>
            <Routes>
              <Route path="" component={Resources} />
              <Route path="logs/:resourceID/*" component={Logs} />
            </Routes>
          </Content>
        </ResourcesProvider>
      </StageContext.Provider>
    </Show>
  );
}
