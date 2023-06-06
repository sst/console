import sst from "./sst.png";
import patrick from "./patrick.jpg";
import { styled } from "@macaron-css/solid";
import { IconChevronUpDown } from "$/ui/icons";
import { createSubscription, useReplicache } from "$/providers/replicache";
import { Route, Routes, useParams } from "@solidjs/router";
import { StageStore } from "$/data/stage";
import { AppStore } from "$/data/app";
import { theme } from "$/ui/theme";
import { Row, Stack } from "$/ui/layout";
import { utility } from "$/ui/utility";
import { Show, createEffect } from "solid-js";
import {
  AppProvider,
  StageProvider,
  useCommandBar,
} from "$/pages/workspace/command-bar";
import { StageContext, createStageContext } from "./context";
import { Resources } from "./resources";

const Content = styled("div", {
  base: {
    padding: theme.contentPadding,
    ...utility.stack(4),
  },
});

const Header = styled("div", {
  base: {
    top: "0",
    position: "sticky",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    backgroundColor: theme.color.background.navbar,
    borderBottom: `1px solid ${theme.color.divider.base}`,
    padding: theme.space[3],
  },
});

const User = styled("a", {
  base: {
    color: theme.color.text.secondary,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: theme.space[4],
    cursor: "pointer",
    fontSize: "0.875rem",
    opacity: "0.8",
    transition: `opacity ${theme.colorFadeDuration} ease-out`,
    ":hover": {
      opacity: "1",
      textDecoration: "none",
    },
  },
});

const UserImage = styled("img", {
  base: {
    borderRadius: "50%",
    backgroundColor: theme.color.background.surface,
    width: 28,
  },
});

const OrgSwitcher = styled("img", {
  base: {
    width: 32,
    height: 32,
    flexShrink: 0,
    padding: 0,
    border: "none",
    borderRadius: "4px",
    backgroundColor: "transparent",
    transition: `border ${theme.colorFadeDuration} ease-out`,
  },
});

const StageSwitcher = styled("div", {
  base: {
    flexShrink: 0,
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    borderLeft: `1px solid ${theme.color.divider.base}`,
    paddingLeft: theme.space[3],
    gap: theme.space[3],
    font: theme.fonts.heading,
    color: theme.color.text.secondary,
  },
});

const SwitcherApp = styled("div", {
  base: {
    fontWeight: "500",
  },
});
const SwitcherStage = styled("div", {
  base: {
    fontSize: "0.875rem",
    color: theme.color.text.dimmed,
  },
});

const SwitcherIcon = styled(IconChevronUpDown, {
  base: {
    color: theme.color.text.dimmed,
    width: 20,
    height: 20,
  },
});

export function Stage() {
  const params = useParams();
  const app = createSubscription(() => AppStore.fromName(params.appName));
  const stage = createSubscription(() =>
    app()
      ? StageStore.fromName(app()!.id, params.stageName)
      : async () => undefined
  );

  createEffect(() => console.log({ ...params }));

  const bar = useCommandBar();
  const rep = useReplicache();

  const stageContext = createStageContext();

  return (
    <Show when={stageContext.app && stageContext.stage}>
      <StageContext.Provider value={stageContext}>
        <Header>
          <Row space="4">
            <OrgSwitcher src={sst} />
            <StageSwitcher onClick={() => bar.show(StageProvider, AppProvider)}>
              <Stack space="1">
                <SwitcherApp>{stageContext.app.name}</SwitcherApp>
                <SwitcherStage>{stageContext.stage.name}</SwitcherStage>
              </Stack>
              <SwitcherIcon />
            </StageSwitcher>
          </Row>
          <User>
            <div
              onClick={() =>
                rep().mutate.app_stage_sync({ stageID: stage()!.id })
              }
            >
              resync
            </div>
            <UserImage src={patrick} />
          </User>
        </Header>
        <Content>
          <Routes>
            <Route path="" component={Resources} />
          </Routes>
        </Content>
      </StageContext.Provider>
    </Show>
  );
}
