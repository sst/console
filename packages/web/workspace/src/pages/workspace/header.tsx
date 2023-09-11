import {
  Row,
  Stack,
  AvatarInitialsIcon,
  Text,
  Tag,
  theme,
  TabTitle,
} from "$/ui";
import { IconChevronUpDown, IconMagnifyingGlass } from "$/ui/icons";
import { utility } from "$/ui/utility";
import { styled } from "@macaron-css/solid";
import { Link } from "@solidjs/router";
import { useWorkspace } from "./context";
import { useCommandBar } from "./command-bar";
import {
  JSX,
  ParentProps,
  Show,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { createInitializedContext } from "$/common/context";
import { useIssuesContext } from "./stage/context";

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
    height: 68,
  },
});

const WorkspaceLogoLink = styled(Link, {
  base: {
    display: "flex",
  },
});

const User = styled("a", {
  base: {
    color: theme.color.text.secondary.base,
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
  },
});

const SwitcherIcon = styled(IconChevronUpDown, {
  base: {
    color: theme.color.text.dimmed.base,
    width: 28,
    height: 28,
  },
});

const JumpToButton = styled("div", {
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

export const PageHeader = styled("div", {
  base: {
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `0 ${theme.space[4]}`,
    borderBottom: `1px solid ${theme.color.divider.base}`,
  },
});

const LogoutButton = styled("span", {
  base: {
    fontWeight: 500,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_sm,
    color: theme.color.text.dimmed.base,
    transition: `color ${theme.colorFadeDuration} ease-out`,
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
  const workspace = useWorkspace();
  const bar = useCommandBar();

  const issues = useIssuesContext();
  const issuesCount = createMemo(
    () =>
      issues().filter((item) => !item.timeResolved && !item.timeIgnored).length,
  );
  const ctx = useHeaderContext();

  return (
    <>
      <Root>
        <Row space="4" vertical="center">
          <WorkspaceLogoLink href={`/${workspace().slug}`}>
            <AvatarInitialsIcon type="workspace" text={workspace().slug} />
          </WorkspaceLogoLink>
          <StageSwitcher
            onClick={() =>
              props.stage
                ? bar.show("stage-switcher", "app-switcher")
                : bar.show("workspace-switcher")
            }
          >
            <Show
              when={props.stage}
              fallback={
                <Text size="lg" weight="medium" color="secondary">
                  {workspace().slug}
                </Text>
              }
            >
              <Stack space="1.5">
                <Text size="lg" weight="medium" color="secondary">
                  {props.app}
                </Text>
                <Text color="dimmed">{props.stage}</Text>
              </Stack>
            </Show>
            <SwitcherIcon />
          </StageSwitcher>
        </Row>
        <Row space="4" vertical="center">
          <JumpToButton onClick={() => bar.show()}>
            <Row space="1" vertical="center">
              <IconMagnifyingGlass
                width="13"
                height="13"
                color={theme.color.icon.dimmed}
              />
              <Text leading="normal" size="xs" color="dimmed">
                Jump to
              </Text>
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
              const dbs = await window.indexedDB.databases();
              dbs.forEach((db) => {
                window.indexedDB.deleteDatabase(db.name!);
              });
              localStorage.clear();
              location.href = "/";
            }}
          >
            Logout
          </LogoutButton>
        </Row>
        {/*
      <User>
        <UserImage />
        <Text
          onClick={async () => {
            const dbs = await window.indexedDB.databases();
            dbs.forEach((db) => {
              window.indexedDB.deleteDatabase(db.name!);
            });
            localStorage.clear();
            location.href = "/";
          }}
        >
          Logout
        </Text>
      </User>
      */}
      </Root>
      <PageHeader>
        <Row space="5" vertical="center">
          <Link href="" end>
            <TabTitle>Resources</TabTitle>
          </Link>
          <Link href="issues">
            <TabTitle
              count={issuesCount() ? issuesCount().toString() : undefined}
            >
              Issues
            </TabTitle>
          </Link>
        </Row>
        <Show when={ctx.children}>{ctx.children}</Show>
      </PageHeader>
    </>
  );
}
