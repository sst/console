import { useReplicache } from "$/providers/replicache";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useRoutes,
  useMatch,
  useNavigate,
  useParams,
} from "@solidjs/router";
import { StageStore } from "$/data/stage";
import { AppStore } from "$/data/app";
import { JSX, Match, Show, Switch, createEffect, createMemo } from "solid-js";
import { NavigationAction, useCommandBar } from "$/pages/workspace/command-bar";
import {
  IssuesProvider,
  MINIMUM_VERSION,
  ResourcesProvider,
  StageContext,
  createStageContext,
  useIssuesContext,
  useOutdated,
  useResourcesContext,
  useStageContext,
} from "./context";
import { Logs } from "./logs";
import { Issues } from "./issues";
import { Resources } from "./resources";
import { IconApp, IconStage, IconSubRight } from "$/ui/icons/custom";
import {
  Header,
  PageHeader,
  HeaderProvider,
  useHeaderContext,
} from "../header";
import { Fullscreen, Row, Stack, TabTitle, theme, utility, Text } from "$/ui";
import { Local } from "./local";
import { IconExclamationTriangle } from "$/ui/icons";
import { styled } from "@macaron-css/solid";
import { useWorkspace } from "../context";
import { useLocalContext } from "$/providers/local";

export function Stage() {
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

const WarningRoot = styled("div", {
  base: {
    ...utility.stack(8),
    marginTop: "-7vh",
    alignItems: "center",
    width: 400,
  },
});

const WarningIcon = styled("div", {
  base: {
    width: 42,
    height: 42,
    color: theme.color.icon.dimmed,
  },
});

const WarningTitle = styled("span", {
  base: {
    ...utility.text.line,
    lineHeight: "normal",
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.medium,
  },
});

const WarningDescription = styled("span", {
  base: {
    textAlign: "center",
    fontSize: theme.font.size.sm,
    lineHeight: theme.font.lineHeight,
    color: theme.color.text.secondary.base,
  },
});

interface WarningProps {
  title: JSX.Element;
  description: JSX.Element;
}
export function Warning(props: WarningProps) {
  return (
    <WarningRoot>
      <Stack horizontal="center" space="5">
        <WarningIcon>
          <IconExclamationTriangle />
        </WarningIcon>
        <Stack horizontal="center" space="2">
          <WarningTitle>{props.title}</WarningTitle>
          <WarningDescription>{props.description}</WarningDescription>
        </Stack>
      </Stack>
    </WarningRoot>
  );
}

export function Inner() {
  const bar = useCommandBar();
  const ctx = useStageContext();
  const issues = useIssuesContext();
  const issuesCount = createMemo(
    () =>
      issues().filter((item) => !item.timeResolved && !item.timeIgnored).length
  );
  const header = useHeaderContext();
  const resources = useResourcesContext();
  const stacks = createMemo(() =>
    resources().filter((r) => r.type === "Stack")
  );
  const outdated = useOutdated();
  const minVersion = createMemo(
    () =>
      outdated()
        .map((r) => r.type === "Stack" && r.enrichment.version)
        .sort()[0]
  );
  const workspace = useWorkspace();

  const nav = useNavigate();
  const loc = useLocation();

  bar.register("stage", async () => {
    return [
      NavigationAction({
        path: "./issues",
        category: ctx.stage.name,
        title: "Issues",
        nav,
      }),
      NavigationAction({
        icon: IconSubRight,
        title: "Resources",
        path: "./resources",
        category: ctx.stage.name,
        nav,
      }),
      {
        icon: IconSubRight,
        title: "View logs...",
        run: (control) => {
          control.show("resource");
        },
        category: ctx.stage.name,
      },
      {
        icon: IconSubRight,
        title: "Switch stage...",
        run: (control) => {
          control.show("stage-switcher");
        },
        category: ctx.stage.name,
      },
    ];
  });

  return (
    <>
      <Header app={ctx.app.name} stage={ctx.stage.name} />
      <Switch>
        <Match when={stacks().length === outdated().length}>
          <Fullscreen inset="root">
            <Warning
              title={
                <>
                  Unsupported SST version
                  {minVersion() ? " v" + minVersion() : ""}
                </>
              }
              description={
                <>
                  To use the SST Console,{" "}
                  <a target="_blank" href="https://github.com/sst/sst/releases">
                    upgrade to v{MINIMUM_VERSION}
                  </a>
                </>
              }
            />
          </Fullscreen>
        </Match>
        <Match when={true}>
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
        </Match>
      </Switch>
    </>
  );
}
