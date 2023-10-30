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
import { Match, Show, Switch, createMemo } from "solid-js";
import { useCommandBar } from "$/pages/workspace/command-bar";
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
import { IconStage } from "$/ui/icons/custom";
import {
  Header,
  HeaderProvider,
  PageHeader,
  useHeaderContext,
} from "../header";
import { Fullscreen, Row, Stack, TabTitle, theme, utility, Text } from "$/ui";
import { Local } from "./local";
import { IconExclamationTriangle } from "$/ui/icons";
import { styled } from "@macaron-css/solid";
import { useWorkspace } from "../context";
import { useLocalContext } from "$/providers/local";

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

const Warning = styled("div", {
  base: {
    ...utility.stack(8),
    alignItems: "center",
    width: 320,
  },
});

const WarningIcon = styled("div", {
  base: {
    width: 42,
    height: 42,
    color: theme.color.icon.dimmed,
  },
});

export function Inner() {
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

  return (
    <>
      <Header app={ctx.app.name} stage={ctx.stage.name} />
      <Switch>
        <Match when={false && !ctx.connected}>
          <Fullscreen>
            <Warning>
              <Stack horizontal="center" space="5">
                <WarningIcon>
                  <IconExclamationTriangle />
                </WarningIcon>
                <Stack horizontal="center" space="2">
                  <Text line size="lg" weight="medium">
                    Over free tier
                  </Text>
                  <Text center size="sm" color="secondary">
                    To continue to use the SST Console with non-local stages{" "}
                    <Link href={`/${workspace().slug}/settings`}>
                      add billing information
                    </Link>
                  </Text>
                </Stack>
              </Stack>
            </Warning>
          </Fullscreen>
        </Match>
        <Match when={stacks().length === outdated().length}>
          <Fullscreen>
            <Warning>
              <Stack horizontal="center" space="5">
                <WarningIcon>
                  <IconExclamationTriangle />
                </WarningIcon>
                <Stack horizontal="center" space="2">
                  <Text line size="lg" weight="medium">
                    Unsupported SST version
                    {minVersion() ? " v" + minVersion() : ""}
                  </Text>
                  <Text center size="sm" color="secondary">
                    To use the SST Console,{" "}
                    <a
                      target="_blank"
                      href="https://github.com/sst/sst/releases"
                    >
                      upgrade to v{MINIMUM_VERSION}
                    </a>
                  </Text>
                </Stack>
              </Stack>
            </Warning>
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
