import { CSSProperties } from "@macaron-css/core";
import { Workspace } from "@console/core/workspace";
import { Row, Stack, AvatarInitialsIcon, Text, theme } from "$/ui";
import { IconApp } from "$/ui/icons/custom";
import { IconChevronUpDown, IconMagnifyingGlass } from "$/ui/icons";
import { utility } from "$/ui/utility";
import { TextButton } from "$/ui/button";
import { styled } from "@macaron-css/solid";
import { Link } from "@solidjs/router";
import { WorkspaceContext } from "./context";
import { useCommandBar } from "./command-bar";
import {
  JSX,
  Show,
  onCleanup,
  useContext,
  ParentProps,
  createEffect,
  createSignal,
} from "solid-js";
import { createInitializedContext } from "$/common/context";
import { dropAllDatabases } from "replicache";

const stageSwitcherStyles: CSSProperties = {
  flexShrink: 0,
  maxWidth: 400,
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  borderLeft: `1px solid ${theme.color.divider.base}`,
  paddingLeft: theme.space[4],
  gap: theme.space[3],
  font: theme.font.family.heading,
};

const Root = styled("div", {
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
    height: theme.headerHeight.root,
  },
});

const WorkspaceLogoLink = styled(Link, {
  base: {
    display: "flex",
  },
});

const SSTConsoleTitle = styled(Link, {
  base: {
    ...stageSwitcherStyles,
  },
});

const SSTIcon = styled("span", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    color: "#FFFBF9",
    backgroundColor: "#395C6B",
    borderRadius: theme.borderRadius,
  },
});

const StageSwitcher = styled("button", {
  base: {
    ...stageSwitcherStyles,
  },
});

const StageSwitcherCopyMain = styled("span", {
  base: {
    ...utility.text.line,
    lineHeight: "normal",
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.medium,
    color: theme.color.text.secondary.base,
  },
});

const StageSwitcherCopySub = styled("span", {
  base: {
    ...utility.text.line,
    lineHeight: "normal",
    color: theme.color.text.dimmed.base,
  },
});

const StageSwitcherCopy = styled("div", {
  base: {
    ...utility.stack(1.5),
    minWidth: 0,
  },
});

const SwitcherIcon = styled(IconChevronUpDown, {
  base: {
    flex: "0 0 auto",
    color: theme.color.text.dimmed.base,
    width: 28,
    height: 28,
  },
});

const JumpToButton = styled("button", {
  base: {
    ...utility.row(9),
    height: 36,
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: theme.borderRadius,
    backgroundColor: theme.color.input.background,
    border: `1px solid ${theme.color.divider.surface}`,
    padding: `0 ${theme.space[1.5]} 0 ${theme.space[2.5]}`,
  },
});

const JumpToButtonKeys = styled("div", {
  base: {
    letterSpacing: 0.5,
    fontSize: theme.font.size.mono_xs,
    padding: `${theme.space[1]} ${theme.space[1.5]}`,
    alignItems: "center",
    textTransform: "uppercase",
    borderRadius: theme.borderRadius,
    backgroundColor: theme.color.divider.surface,
    lineHeight: "normal",
    color: theme.color.text.dimmed.surface,
  },
});

const JumpToButtonCopy = styled("span", {
  base: {
    lineHeight: "normal",
    fontSize: theme.font.size.xs,
    color: theme.color.text.dimmed.base,
  },
});

export const PageHeader = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    padding: `0 ${theme.space[4]}`,
    justifyContent: "space-between",
    height: theme.headerHeight.stage,
    borderBottom: `1px solid ${theme.color.divider.base}`,
  },
});

const LogoutButton = styled(TextButton, {
  base: {
    ...utility.text.label,
    fontSize: theme.font.size.mono_sm,
    color: theme.color.text.dimmed.base,
    ":hover": {
      color: theme.color.text.secondary.base,
    },
  },
});

function isMac() {
  return navigator.userAgent.toUpperCase().indexOf("MAC") !== -1;
}

export const { provider: HeaderProvider, use: useHeaderContext } =
  createInitializedContext("HeaderContext", () => {
    const [children, setChildren] = createSignal<JSX.Element>();
    return {
      set: setChildren,
      clear: () => setChildren(undefined),
      get children() {
        return children();
      },
      get ready() {
        return true;
      },
    };
  });

export function HeaderSlot(props: ParentProps) {
  const ctx = useHeaderContext();
  createEffect(() => {
    ctx.set(props.children);
  });

  onCleanup(() => {
    ctx.clear();
  });

  return null;
}

export function Header(props: { app?: string; stage?: string }) {
  const workspace = useContext(WorkspaceContext);
  const bar = useCommandBar();

  return (
    <Root>
      <Row space="4" vertical="center">
        <Show
          when={workspace}
          fallback={
            <>
              <Link href="/">
                <SSTIcon>
                  <IconApp width="20" height="20" />
                </SSTIcon>
              </Link>
              <SSTConsoleTitle href="/">
                <StageSwitcherCopyMain>Console</StageSwitcherCopyMain>
              </SSTConsoleTitle>
            </>
          }
        >
          <WorkspaceLogoLink href={`/${workspace!().slug}`}>
            <AvatarInitialsIcon type="workspace" text={workspace!().slug} />
          </WorkspaceLogoLink>
          <StageSwitcher
            onClick={() =>
              props.stage
                ? bar.show("stage-switcher")
                : bar.show("workspace-switcher")
            }
          >
            <Show
              when={props.stage}
              fallback={
                <StageSwitcherCopy>
                  <StageSwitcherCopyMain>
                    {workspace!().slug}
                  </StageSwitcherCopyMain>
                </StageSwitcherCopy>
              }
            >
              <StageSwitcherCopy>
                <StageSwitcherCopyMain>{props.app}</StageSwitcherCopyMain>
                <StageSwitcherCopySub>{props.stage}</StageSwitcherCopySub>
              </StageSwitcherCopy>
            </Show>
            <SwitcherIcon />
          </StageSwitcher>
        </Show>
      </Row>
      <Row space="4" vertical="center">
        <JumpToButton onClick={() => bar.show()}>
          <Row space="1" vertical="center">
            <IconMagnifyingGlass
              width="13"
              height="13"
              color={theme.color.icon.dimmed}
            />
            <JumpToButtonCopy>Jump to</JumpToButtonCopy>
          </Row>
          <Row space="1" vertical="center">
            <JumpToButtonKeys>
              {isMac() ? <>&#8984;</> : "Ctrl"}
            </JumpToButtonKeys>
            <JumpToButtonKeys>K</JumpToButtonKeys>
          </Row>
        </JumpToButton>
        <LogoutButton
          onClick={async () => {
            await dropAllDatabases();
            localStorage.clear();
            location.href = "/";
          }}
        >
          Logout
        </LogoutButton>
      </Row>
    </Root>
  );
}
