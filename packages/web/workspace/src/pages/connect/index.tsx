import {Link, useNavigate, useSearchParams} from "@solidjs/router";
import {createSubscription} from "$/providers/replicache";
import {useAuth} from "$/providers/auth";
import {For} from "solid-js";
import {WorkspaceStore} from "../../data/workspace";
import {Stack} from "$/ui/layout";
import {styled} from "@macaron-css/solid";
import {theme} from "$/ui/theme";
import {utility} from "$/ui/utility";
import {WorkspaceIcon} from "$/ui/workspace-icon";
import {setAccount} from "$/data/storage";

const Root = styled("div", {
  base: {
    position: "fixed",
    inset: "0",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
});

const ConnectWorkspaceHeader = styled("h1", {
  base: {
    fontSize: theme.font.size.lg,
    fontWeight: 500,
  },
  variants: {
    loading: {
      true: {
        color: theme.color.text.secondary.base,
      },
      false: {},
    },
  },
  defaultVariants: {
    loading: false,
  },
});

const ConnectWorkspaceList = styled("div", {
  base: {
    border: `1px solid ${theme.color.divider.base}`,
    borderRadius: theme.borderRadius,
    overflow: "hidden",
  },
});

const ConnectWorkspaceRow = styled("div", {
  base: {
    ...utility.row(2),
    padding: `${theme.space[3]} ${theme.space[3]}`,
    width: 320,
    alignItems: "center",
    color: theme.color.text.secondary.base,
    lineHeight: "normal",
    borderTop: `1px solid ${theme.color.divider.base}`,
    ":hover": {
      color: theme.color.text.primary.surface,
      backgroundColor: theme.color.background.surface,
    },
    selectors: {
      "&:first-child": {
        borderTop: "none",
      },
    },
  },
});

const ConnectWorkspaceName = styled("span", {
  base: {
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
});

export function Connect() {
  const auth = useAuth();
  const [query] = useSearchParams();
  const nav = useNavigate();

  return (
    <Root>
      <Stack horizontal="center" space="5">
        <ConnectWorkspaceHeader>
          Connect `{query.app}/{query.stage}` to a workspace
        </ConnectWorkspaceHeader>
        <ConnectWorkspaceList>
          <For each={Object.values(auth)}>
            {(account) => {
              const workspaces = createSubscription(
                WorkspaceStore.list,
                [],
                () => account.replicache
              );
              return (
                <For each={workspaces()}>
                  {(workspace) => (
                    <ConnectWorkspaceRow
                      onClick={() => {
                        setAccount(account.token.accountID);
                        nav(`/${workspace.slug}/connect` + location.search);
                      }}
                    >
                      <WorkspaceIcon text={workspace.slug} />
                      <ConnectWorkspaceName>
                        {workspace.slug}
                      </ConnectWorkspaceName>
                    </ConnectWorkspaceRow>
                  )}
                </For>
              );
            }}
          </For>
        </ConnectWorkspaceList>
      </Stack>
    </Root>
  );
}
