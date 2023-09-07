import { styled } from "@macaron-css/solid";
import { createSubscription, useReplicache } from "$/providers/replicache";
import { Link, Route, Routes, useNavigate, useParams } from "@solidjs/router";
import { StageStore } from "$/data/stage";
import { AppStore } from "$/data/app";
import { theme } from "$/ui/theme";
import { utility } from "$/ui/utility";
import { ComponentProps, JSX, Show, createEffect } from "solid-js";
import { useCommandBar } from "$/pages/workspace/command-bar";
import { ResourcesProvider, StageContext, createStageContext } from "./context";
import { Logs } from "./logs";
import { Issues } from "./issues";
import { Issue } from "./issues/detail";
import { Resources } from "./resources";
import { IconStage } from "$/ui/icons/custom";
import { Header } from "../header";
import { Row, TabTitle } from "$/ui";

type PageHeaderProps = ComponentProps<typeof PageHeaderRoot> & {
  right?: JSX.Element;
};

export const PageHeaderRoot = styled("div", {
  base: {
    height: 56,
    // display: "flex",
    display: "none",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `0 ${theme.space[4]}`,
    borderBottom: `1px solid ${theme.color.divider.base}`,
  },
});

export function PageHeader(props: PageHeaderProps) {
  return (
    <PageHeaderRoot {...props}>
      <Row space="5" vertical="center">
        {props.children}
      </Row>
      {props.right}
    </PageHeaderRoot>
  );
}

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
          <Header app={app()?.name} stage={stage()?.name} />
          <PageHeader>
            <Link href="">
              <TabTitle state="active">Resources</TabTitle>
            </Link>
            <Link href="issues">
              <TabTitle count="99+" state="inactive">
                Issues
              </TabTitle>
            </Link>
          </PageHeader>
          <div>
            <Routes>
              <Route path="" component={Resources} />
              <Route path="issues" component={Issues} />
              <Route path="issues/:issueID" component={Issue} />
              <Route path="logs/:resourceID/*" component={Logs} />
            </Routes>
          </div>
        </ResourcesProvider>
      </StageContext.Provider>
    </Show>
  );
}
