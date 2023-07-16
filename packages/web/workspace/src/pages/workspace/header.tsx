import { Row, Stack, WorkspaceIcon, Text, theme } from "$/ui";
import { IconChevronUpDown } from "$/ui/icons";
import { styled } from "@macaron-css/solid";
import { Link } from "@solidjs/router";
import { useWorkspace } from "./context";
import { useCommandBar } from "./command-bar";
import { Show } from "solid-js";

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

export function Header(props: { app?: string; stage?: string }) {
  const workspace = useWorkspace();
  const bar = useCommandBar();

  return (
    <Root>
      <Row space="4" vertical="center">
        <Link href={`/${workspace().slug}`}>
          <WorkspaceIcon text={workspace().slug} />
        </Link>
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
  );
}
