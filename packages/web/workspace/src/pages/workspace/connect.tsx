import { AppStore } from "$/data/app";
import { createSubscription, useReplicache } from "$/providers/replicache";
import { StageStore } from "$/data/stage";
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "@solidjs/router";
import { Show, createMemo } from "solid-js";
import { styled } from "@macaron-css/solid";
import { theme } from "$/ui/theme";
import { utility } from "$/ui/utility";
import { IconArrowPathSpin } from "$/ui/icons/custom";
import { Stack } from "$/ui/layout";
import { WorkspaceIcon } from "$/ui/workspace-icon";
import { WorkspaceStore } from "$/data/workspace";

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
    color: theme.color.text.secondary.base,
  },
});

const ConnectWorkspaceRow = styled("a", {
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

const ConnectWorkspaceList = styled("div", {
  base: {
    border: `1px solid ${theme.color.divider.base}`,
    borderRadius: theme.borderRadius,
    overflow: "hidden",
  },
});

const ConnectWorkspaceIcon = styled("div", {
  base: {
    width: 24,
    height: 24,
    color: theme.color.text.secondary.base,
    opacity: theme.iconOpacity,
  },
});

export function Connect() {
  const rep = useReplicache();
  const [query] = useSearchParams();
  rep().mutate.connect({
    aws_account_id: query.aws_account_id!,
    app: query.app!,
    stage: query.stage!,
    region: query.region!,
  });
  const params = useParams();

  const workspace = createSubscription(() =>
    WorkspaceStore.fromSlug(params.workspaceSlug)
  );
  const app = createSubscription(() => AppStore.fromName(query.app!));
  const stages = createSubscription(
    () => StageStore.forApp(app()?.id || "unknown"),
    []
  );
  const stage = createMemo(() => stages().find((s) => s.name === query.stage));

  return (
    <Root>
      <Show
        when={!stage()}
        fallback={<Navigate href={`../${app()?.name}/${stage()?.name}`} />}
      >
        <Stack horizontal="center" space="5">
          <ConnectWorkspaceIcon>
            <IconArrowPathSpin />
          </ConnectWorkspaceIcon>
          <Stack horizontal="center" space="3">
            <ConnectWorkspaceHeader>
              Connecting to workspace&hellip;
            </ConnectWorkspaceHeader>
            <ConnectWorkspaceList>
              <ConnectWorkspaceRow href="#">
                <WorkspaceIcon text={workspace()?.slug || ""} />
                <ConnectWorkspaceName>{workspace()?.slug}</ConnectWorkspaceName>
              </ConnectWorkspaceRow>
            </ConnectWorkspaceList>
          </Stack>
        </Stack>
      </Show>
    </Root>
  );
}
