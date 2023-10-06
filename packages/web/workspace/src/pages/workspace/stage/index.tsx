import { useReplicache } from "$/providers/replicache";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "@solidjs/router";
import { StageStore } from "$/data/stage";
import { AppStore } from "$/data/app";
import { Show, createMemo } from "solid-js";
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
import {
  Header,
  HeaderProvider,
  PageHeader,
  useHeaderContext,
} from "../header";
import { Row, TabTitle } from "$/ui";
import { Local } from "./local";

export function Stage() {
  const bar = useCommandBar();
  const rep = useReplicache();
  const nav = useNavigate();
  const params = useParams();

  const app = AppStore.all.watch(
    rep,
    () => [],
    (items) => items.find((app) => app.name === params.appName)
  );
  const stage = StageStore.list.watch(
    rep,
    () => [],
    (items) =>
      items.find(
        (stage) => stage.appID === app()?.id && stage.name === params.stageName
      )
  );

  bar.register("stage-switcher", async () => {
    const stages = await rep()
      .query((tx) => StageStore.list(tx))
      .then((stages) => stages.filter((stage) => stage.appID === app()?.id));
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
            <HeaderProvider>
              <Inner />
            </HeaderProvider>
          </IssuesProvider>
        </ResourcesProvider>
      </StageContext.Provider>
    </Show>
  );
}

export function Inner() {
  const ctx = useStageContext();
  const issues = useIssuesContext();
  const issuesCount = createMemo(
    () =>
      issues().filter((item) => !item.timeResolved && !item.timeIgnored).length
  );
  const header = useHeaderContext();
  return (
    <>
      <Header app={ctx.app.name} stage={ctx.stage.name} />
      <PageHeader>
        <Row space="5" vertical="center">
          <Link href="resources">
            <TabTitle>Resources</TabTitle>
          </Link>
          <Link href="issues">
            <TabTitle
              count={issuesCount() ? issuesCount().toString() : undefined}
            >
              Issues
            </TabTitle>
          </Link>
          <Show when={ctx.connected}>
            <Link href="local">
              <TabTitle>Local</TabTitle>
            </Link>
          </Show>
        </Row>
        <Show when={header.children}>{header.children}</Show>
      </PageHeader>
      <div>
        <Routes>
          <Route path="resources" component={Resources} />
          <Route path="resources/logs/:resourceID/*" component={Logs} />
          <Route path="issues/*" component={Issues} />
          <Route path="local/*" component={Local} />
          <Route path="*" element={<Navigate href="resources" />} />
        </Routes>
      </div>
    </>
  );
}
