import {
  Row,
  Text,
  theme,
  Stack,
  Button,
  utility,
  TextButton,
} from "$/ui";
import {
  For,
  Show,
  Match,
  Switch,
  createMemo,
  createEffect,
} from "solid-js";
import {
  AppRepoStore,
  GithubOrgStore,
  GithubRepoStore,
} from "$/data/app";
import { Header } from "../header";
import { Link } from "@solidjs/router";
import { useAppContext } from "./context";
import { styled } from "@macaron-css/solid";
import { IconChevronRight } from "$/ui/icons";
import { IconGitHub } from "$/ui/icons/custom";
import { useReplicache } from "$/providers/replicache";

const Root = styled("div", {
  base: {
    padding: theme.space[4],
  },
});

const PageHeader = styled("div", {
  base: {
    ...utility.stack(0),
    height: 40,
    justifyContent: "space-between",
  },
});

const ManageIcon = styled("div", {
  base: {
    top: 2,
    position: "relative",
    opacity: theme.iconOpacity,
  },
});

const ButtonIcon = styled("span", {
  base: {
    width: 18,
    height: 18,
    marginRight: 6,
    verticalAlign: -4,
    display: "inline-block",
  },
});

const RepoLabel = styled("span", {
  base: {
    ...utility.text.label,
    color: theme.color.text.dimmed.base,
    fontSize: theme.font.size.mono_sm,
  },
});

const RepoLink = styled("a", {
  base: {
    ...utility.row(0),
    gap: 5,
    color: theme.color.text.secondary.base,
    fontSize: theme.font.size.sm,
    ":hover": {
      color: theme.color.text.primary.base,
    },
  },
});

const RepoLinkCopy = styled("span", {
  base: {
    ...utility.row(0),
    alignItems: "center",
  },
});

const RepoLinkIcon = styled("span", {
  base: {
    lineHeight: 0,
    color: theme.color.icon.secondary,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${RepoLink}:hover &`]: {
        color: theme.color.icon.primary,
      },
    },
  },
});

const RepoLinkSeparator = styled("span", {
  base: {
    color: theme.color.text.dimmed.base,
    paddingInline: 3,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${RepoLink}:hover &`]: {
        color: theme.color.text.secondary.base,
      },
    },
  },
});

export function Overview() {
  const rep = useReplicache();
  const app = useAppContext();
  const appRepo = AppRepoStore.forApp.watch(
    rep,
    () => [app.app.id],
  );
  createEffect(() => {
    console.log("appRepo", app.app.id, appRepo());
  });
  const ghRepo = GithubRepoStore.all.watch(
    rep,
    () => [],
    repos => repos.find((repo) => repo.repoID === appRepo()[0]?.repoID)
  );
  const ghRepoOrg = GithubOrgStore.all.watch(
    rep,
    () => [],
    (orgs) => orgs.find((org) => org.orgID === ghRepo()?.orgID)
  );

  function renderRepoLink() {
    return (
      <Stack space="1.5" horizontal="end">
        <RepoLabel>Connected</RepoLabel>
        <RepoLink
          target="_blank"
          href={`https://github.com/${ghRepoOrg()?.login}/${ghRepo()?.name}`}
        >
          <RepoLinkIcon>
            <IconGitHub width="16" height="16" />
          </RepoLinkIcon>
          <RepoLinkCopy>
            {ghRepoOrg()?.login}
            <RepoLinkSeparator>/</RepoLinkSeparator>
            {ghRepo()?.name}
          </RepoLinkCopy>
        </RepoLink>
      </Stack>
    );
  }

  return (
    <>
      <Header app={app.app.name} />
      <Root>
        <Stack space="4">
          <Row space="5" vertical="center" horizontal="between">
            <PageHeader>
              <Text size="lg" weight="medium">
                {app.app.name}
              </Text>
              <Link href="settings">
                <TextButton>
                  <Row space="0.5" horizontal="center">
                    Manage app
                    <ManageIcon>
                      <IconChevronRight width="13" height="13" />
                    </ManageIcon>
                  </Row>
                </TextButton>
              </Link>
            </PageHeader>
            <Show
              when={!appRepo()}
              fallback={renderRepoLink()}
            >
              <Link href="settings">
                <Button color="github">
                  <ButtonIcon>
                    <IconGitHub />
                  </ButtonIcon>
                  Connect Repo
                </Button>
              </Link>
            </Show>
          </Row>
        </Stack>
      </Root>
    </>
  );
}
