import patrick from "./patrick.jpg";
import { styled } from "@macaron-css/solid";
import { IconChevronUpDown } from "$/ui/icons";
import { createSubscription, useReplicache } from "$/providers/replicache";
import { Route, Routes, useNavigate, useParams } from "@solidjs/router";
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
import { ResourcesProvider, StageContext, createStageContext } from "./context";
import { Resources } from "./resources";
import { Logs } from "./logs";
import { IconApp, IconStage } from "$/ui/icons/custom";

const Content = styled("div", {
  base: {
    padding: theme.space[4],
    ...utility.stack(4),
  },
});

const Header = styled("div", {
  base: {
    top: "0",
    zIndex: 1,
    position: "sticky",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    backgroundColor: theme.color.background.navbar,
    borderBottom: `1px solid ${theme.color.divider.base}`,
    padding: `0 ${theme.space[4]}`,
    height: 68,
  },
});

const User = styled("a", {
  base: {
    color: theme.color.text.secondary,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: theme.space[4],
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

const StageSwitcher = styled("div", {
  base: {
    flexShrink: 0,
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    borderLeft: `1px solid ${theme.color.divider.base}`,
    paddingLeft: theme.space[4],
    gap: theme.space[3],
    font: theme.font.family.heading,
    color: theme.color.text.secondary,
  },
});

const SwitcherApp = styled("div", {
  base: {
    fontSize: theme.font.size.lg,
    fontWeight: 500,
  },
});
const SwitcherStage = styled("div", {
  base: {
    fontSize: theme.font.size.base,
    color: theme.color.text.dimmed,
  },
});

const SwitcherIcon = styled(IconChevronUpDown, {
  base: {
    color: theme.color.text.dimmed,
    width: 28,
    height: 28,
  },
});

const Icon = styled("span", {
  base: {
    flexShrink: 0,
    width: 36,
    height: 36,
    backgroundSize: "cover",
    borderRadius: theme.borderRadius,
  },
});

interface WorkspaceIconProps {
  text: string;
}
export function WorkspaceIcon(props: WorkspaceIconProps) {
  return (
    <Icon
      title={props.text}
      style={{
        "background-image": `url("data:image/svg+xml;utf8,${encodeURIComponent(
          generateAvatarSvg({
            text: props.text.slice(0, 2).toUpperCase(),
          })
        )}")`,
      }}
    />
  );
}

export function Stage() {
  const bar = useCommandBar();
  const rep = useReplicache();
  const nav = useNavigate();
  const params = useParams();

  const app = createSubscription(() => AppStore.fromName(params.appName));
  const stage = createSubscription(() =>
    app()
      ? StageStore.fromName(app()!.id, params.stageName)
      : async () => undefined
  );

  bar.register("app", async () => {
    const apps = await rep().query(AppStore.list());
    return apps.map((app) => ({
      icon: IconApp,
      category: "App",
      title: `Switch to "${app.name}" app`,
      run: async (control) => {
        const stages = await rep().query(StageStore.forApp(app.id));
        nav(`/${params.workspaceSlug}/${app.name}/${stages[0].name}`);
        control.hide();
      },
    }));
  });

  bar.register("stage", async () => {
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
          <Header>
            <Row space="4" vertical="center">
              <WorkspaceIcon text="S" fontSize={0.5} />
              <StageSwitcher onClick={() => bar.show("stage", "app")}>
                <Stack space="1.5">
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
              <Route path="logs/:resourceID/*" component={Logs} />
            </Routes>
          </Content>
        </ResourcesProvider>
      </StageContext.Provider>
    </Show>
  );
}

interface AvatarSvgProps {
  text: string;
  round?: boolean;
  size?: number;
  bgColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
}
function generateAvatarSvg({
  text,
  size = 64,
  round = false,
  fontSize = 0.4,
  bgColor = "#395C6B",
  textColor = "#FFFBF9",
  fontWeight = "normal",
  fontFamily = "monospace",
}: AvatarSvgProps) {
  // From https://github.com/gilbitron/ui-avatar-svg
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}px" height="${size}px" viewBox="0 0 ${size} ${size}" version="1.1"><${
    round ? "circle" : "rect"
  } fill="${bgColor}" width="${size}" height="${size}" cx="${size / 2}" cy="${
    size / 2
  }" r="${
    size / 2
  }"/><text x="50%" y="50%" style="color: ${textColor};line-height: 1;font-family: ${fontFamily};" alignment-baseline="middle" text-anchor="middle" font-size="${Math.round(
    size * fontSize
  )}" font-weight="${fontWeight}" dy=".1em" dominant-baseline="middle" fill="${textColor}">${text}</text></svg>`;
}
