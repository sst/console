import { Link, Navigate, Route, Routes, useNavigate } from "@solidjs/router";
import { JSX, Match, Show, Switch, createMemo, createEffect } from "solid-js";
import { RunStore, StateUpdateStore } from "$/data/app";
import { NavigationAction, useCommandBar } from "$/pages/workspace/command-bar";
import { useFlags } from "$/providers/flags";
import { createSubscription, useReplicache } from "$/providers/replicache";
import {
  useOutdated,
  StageContext,
  IssuesProvider,
  useStageContext,
  MINIMUM_VERSION,
  useIssuesContext,
  ResourcesProvider,
  createStageContext,
  StateResourcesProvider,
} from "./context";
import { useWorkspace } from "../context";
import { Logs } from "./logs";
import { Issues } from "./issues";
import { Autodeploy } from "./autodeploy";
import { Resources } from "./resources";
import { IconSubRight } from "$/ui/icons/custom";
import {
  Header,
  PageHeader,
  HeaderProvider,
  useHeaderContext,
} from "../header";
import { Fullscreen, Row, Stack, TabTitle, theme, utility } from "$/ui";
import { Local } from "./local";
import { IconExclamationTriangle } from "$/ui/icons";
import { styled } from "@macaron-css/solid";
import { NotFound } from "../../not-found";
import { DateTime } from "luxon";

export function Stage() {
  const stageContext = createStageContext();

  return (
    <Switch>
      <Match when={stageContext.app && stageContext.stage}>
        <StageContext.Provider value={stageContext}>
          <StateResourcesProvider>
            <ResourcesProvider>
              <IssuesProvider>
                <HeaderProvider>
                  <Inner />
                </HeaderProvider>
              </IssuesProvider>
            </ResourcesProvider>
          </StateResourcesProvider>
        </StageContext.Provider>
      </Match >
      <Match when={!stageContext.stage}>
        <NotFound header inset="header" message="Stage not found" />
      </Match >
    </Switch>
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
  const rep = useReplicache();
  const bar = useCommandBar();
  const ctx = useStageContext();
  const issues = useIssuesContext();
  const issuesCount = createMemo(
    () =>
      issues().filter((item) => !item.timeResolved && !item.timeIgnored).length
  );
  const updates = StateUpdateStore.forStage.watch(rep, () => [ctx.stage.id]);
  const header = useHeaderContext();
  const outdated = useOutdated();
  const minVersion = createMemo(
    () =>
      outdated()
        .map((r) => r.type === "Stack" && r.enrichment.version)
        .sort()[0]
  );
  const latestRunError = createSubscription(async (tx) => {
    const runs = await RunStore.forStage(tx, ctx.stage.id);
    const run = runs.sort(
      (a, b) =>
        DateTime.fromISO(b.time.created).toMillis() -
        DateTime.fromISO(a.time.created).toMillis()
    )[0];
    return (
      run?.error &&
      run.error.type !== "config_target_returned_undefined" &&
      run.error.type !== "config_branch_remove_skipped" &&
      run.error.type !== "target_not_matched"
    );
  });

  const nav = useNavigate();

  bar.register("stage", async () => {
    return [
      NavigationAction({
        path: "./updates",
        category: ctx.stage.name,
        title: "Updates",
        nav,
      }),
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
      NavigationAction({
        icon: IconSubRight,
        title: "Local",
        path: "./local",
        category: ctx.stage.name,
        disabled: !ctx.connected,
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
        <Match when={ctx.stage.unsupported}>
          <Fullscreen inset="header">
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
        <Match when={ctx.stage.timeDeleted}>
          <NotFound inset="header" message="Stage has been removed" />
        </Match>
        <Match when={true}>
          <PageHeader>
            <Row space="5" vertical="center">
              <Link href="resources">
                <TabTitle size="sm">Resources</TabTitle>
              </Link>
              <Show when={updates().length > 0}>
                <Link href="autodeploy">
                  <TabTitle size="sm" count={latestRunError.value ? "•" : ""}>
                    Autodeploy
                  </TabTitle>
                </Link>
              </Show>
              <Show when={!ctx.stage.timeDeleted}>
                <Link href="issues">
                  <TabTitle
                    size="sm"
                    count={issuesCount() ? issuesCount().toString() : undefined}
                  >
                    Issues
                  </TabTitle>
                </Link>
              </Show>
              <Show when={updates().length > 0}>
                <Link href="logs">
                  <TabTitle size="sm">Logs</TabTitle>
                </Link>
              </Show>
              <Show when={ctx.connected}>
                <Link href="local">
                  <TabTitle size="sm">Local</TabTitle>
                </Link>
              </Show>
            </Row>
            <Show when={header.children}>{header.children}</Show>
          </PageHeader>
          <div>
            <Routes>
              <Route path="resources/*" component={Resources} />
              <Route path="autodeploy/*" component={Autodeploy} />
              <Route path="issues/*" component={Issues} />
              <Route path="logs/*" component={Logs} />
              <Route path="local/*" component={Local} />
              <Route path="" element={<Navigate href="resources" />} />
              <Route path="*" element={<NotFound inset="header-tabs" />} />
            </Routes>
          </div>
        </Match>
      </Switch>
    </>
  );
}
