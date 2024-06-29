import {
  Tag,
  Row,
  theme,
  Stack,
  Button,
  utility,
  TabTitle,
  ButtonIcon,
} from "$/ui";
import { DateTime } from "luxon";
import { For, Show, Match, Switch } from "solid-js";
import {
  AppRepoStore,
  GithubOrgStore,
  GithubRepoStore,
  RunStore,
  StateUpdateStore,
} from "$/data/app";
import { Header, PageHeader } from "../header";
import { Link } from "@solidjs/router";
import { useAppContext } from "./context";
import { styled } from "@macaron-css/solid";
import type { Stage } from "@console/core/app";
import { IconPr, IconGit, IconCommit, IconGitHub } from "$/ui/icons/custom";
import { createSubscription, useReplicache } from "$/providers/replicache";
import { parseTime, formatSinceTime, formatCommit } from "$/common/format";
import { ActiveStagesForApp } from "$/data/stage";
import { useLocalContext } from "$/providers/local";
import { AWS } from "$/data/aws";
import { githubCommit, githubRepo } from "$/common/url-builder";
import { filter, pipe, sortBy } from "remeda";

const Root = styled("div", {
  base: {
    padding: theme.space[4],
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

const Stages = styled("div", {
  base: {
    ...utility.stack(4),
  },
});

const CardRoot = styled("div", {
  base: {
    ...utility.row(0),
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: theme.borderRadius,
    border: `1px solid ${theme.color.divider.base}`,
    padding: `${theme.space[3]} ${theme.space[4]} ${theme.space[4]} ${theme.space[4]}`,
  },
});

const CardBodyLeft = styled("div", {
  base: {
    ...utility.stack(2),
  },
});

const CardTitle = styled("div", {
  base: {
    ...utility.row(3),
    alignItems: "center",
  },
});

const CardTitleText = styled(Link, {
  base: {
    lineHeight: "26px",
    color: theme.color.text.primary.base,
    fontWeight: theme.font.weight.medium,
  },
});

const CardIcon = styled("div", {
  base: {
    width: 12,
    height: 12,
    borderRadius: "50%",
  },
  variants: {
    status: {
      base: {
        backgroundColor: theme.color.divider.base,
      },
      unsupported: {
        opacity: 0.5,
        backgroundColor: theme.color.divider.base,
      },
      success: {
        backgroundColor: `hsla(${theme.color.base.blue}, 100%)`,
      },
      error: {
        backgroundColor: `hsla(${theme.color.base.red}, 100%)`,
      },
      updating: {
        backgroundColor: `hsla(${theme.color.base.yellow}, 100%)`,
        animation: "glow-pulse-status 1.7s linear infinite alternate",
      },
    },
  },
});

const CardUpdatedTime = styled("span", {
  base: {
    marginLeft: `calc(${theme.space[3]} + 12px)`,
    fontSize: theme.font.size.xs,
    color: theme.color.text.dimmed.base,
  },
});

const CardBodyRight = styled("div", {
  base: {
    ...utility.row(20),
  },
});

const CardRegion = styled("span", {
  base: {
    letterSpacing: 0.5,
    lineHeight: "26px",
    textAlign: "right",
    textTransform: "uppercase",
    fontSize: theme.font.size.xs,
    color: theme.color.text.dimmed.base,
  },
});

const CardGit = styled("div", {
  base: {
    ...utility.stack(1.5),
    alignItems: "stretch",
    justifyContent: "center",
  },
});

const CardGitLink = styled("a", {
  base: {
    ...utility.row(1),
    alignItems: "center",
  },
});

const CardGitIcon = styled("span", {
  base: {
    lineHeight: 0,
    opacity: theme.iconOpacity,
    color: theme.color.text.secondary.base,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${CardGitLink}:hover &`]: {
        color: theme.color.text.primary.base,
      },
    },
  },
  variants: {
    size: {
      sm: {
        width: 12,
        height: 12,
        color: theme.color.text.dimmed.base,
        selectors: {
          [`${CardGitLink}:hover &`]: {
            color: theme.color.text.secondary.base,
          },
        },
      },
      md: {
        width: 14,
        height: 14,
      },
    },
  },
});

const CardGitBranch = styled("span", {
  base: {
    ...utility.text.line,
    maxWidth: 140,
    lineHeight: "normal",
    fontSize: theme.font.size.sm,
    color: theme.color.text.dimmed.base,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${CardGitLink}:hover &`]: {
        color: theme.color.text.secondary.base,
      },
    },
  },
});

const CardGitCommit = styled("span", {
  base: {
    lineHeight: "normal",
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_base,
    color: theme.color.text.secondary.base,
    fontWeight: theme.font.weight.medium,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${CardGitLink}:hover &`]: {
        color: theme.color.text.primary.base,
      },
    },
  },
});

const CardGitMessage = styled("div", {
  base: {
    ...utility.text.line,
    width: 260,
    lineHeight: "normal",
    fontSize: theme.font.size.xs,
    color: theme.color.text.dimmed.base,
  },
});

export function Overview() {
  const rep = useReplicache();
  const app = useAppContext();
  const appRepo = AppRepoStore.forApp.watch(rep, () => [app.app.id]);
  const ghRepo = GithubRepoStore.all.watch(
    rep,
    () => [],
    (repos) => repos.find((repo) => repo.id === appRepo()[0]?.repoID)
  );
  const ghRepoOrg = GithubOrgStore.all.watch(
    rep,
    () => [],
    (orgs) =>
      orgs.find(
        (org) => org.id === ghRepo()?.githubOrgID && !org.time.disconnected
      )
  );

  const local = useLocalContext();
  const stages = createSubscription(async (tx) => {
    return sortBy(
      await ActiveStagesForApp(app.app.id)(tx),
      (stage) =>
        app.app.name === local().app && stage.name === local().stage ? 0 : 1,
      [(stage) => stage.timeUpdated, "desc"]
    );
  });
  const latestRunError = createSubscription(async (tx) => {
    const runs = await RunStore.all(tx);
    const run = runs
      .filter((run) => run.appID === app.app.id)
      .sort(
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

  function Card(props: { stage: Stage.Info }) {
    const latest = createSubscription(async (tx) => {
      const updates = await StateUpdateStore.forStage(tx, props.stage.id);
      if (!updates.length) return;
      const update = updates.sort((a, b) => b.index - a.index)[0];
      let result = {
        update,
      };
      if (!update.runID) return result;
      const run = await RunStore.get(tx, props.stage.id, update.runID);
      if (run?.trigger.source !== "github") result;
      if (!run) return result;
      const repoUrl = githubRepo(run.trigger.repo.owner, run.trigger.repo.repo);
      return {
        ...result,
        url: githubCommit(repoUrl, run.trigger.commit.id),
        trigger: run.trigger,
      };
    });
    const local = useLocalContext();
    const aws = createSubscription(async (tx) =>
      AWS.AccountStore.get(tx, props.stage.awsAccountID)
    );
    return (
      <CardRoot>
        <CardBodyLeft>
          <CardTitle>
            <Switch>
              <Match when={props.stage.unsupported}>
                <CardIcon status="unsupported" />
              </Match>
              <Match when={latest.value && !latest.value.update.time.completed}>
                <CardIcon status="updating" />
              </Match>
              <Match
                when={
                  latest.value?.update.time.completed &&
                  latest.value?.update.errors.length === 0
                }
              >
                <CardIcon status="success" />
              </Match>
              <Match when={latest.value?.update.errors.length}>
                <CardIcon status="error" />
              </Match>
              <Match when={true}>
                <CardIcon status="base" />
              </Match>
            </Switch>
            <Row space="2">
              <CardTitleText href={props.stage.name}>
                {props.stage.name}
              </CardTitleText>
              <Show
                when={
                  props.stage.name === local().stage &&
                  app.app.name === local().app
                }
              >
                <Link href={`${props.stage.name}/local`}>
                  <Tag level="tip" style="outline">
                    Local
                  </Tag>
                </Link>
              </Show>
              <Show when={latest.value?.update.errors.length}>
                <Link
                  href={`${props.stage.name}/updates/${latest.value?.update.id}`}
                >
                  <Tag level="danger" style="outline">
                    Error
                  </Tag>
                </Link>
              </Show>
            </Row>
          </CardTitle>
          <CardUpdatedTime
            title={parseTime(props.stage.timeUpdated).toLocaleString(
              DateTime.DATETIME_FULL
            )}
          >
            Updated {formatSinceTime(props.stage.timeUpdated, true)}
          </CardUpdatedTime>
        </CardBodyLeft>
        <CardBodyRight>
          <Show
            when={
              latest.value && "trigger" in latest.value ? latest.value : false
            }
          >
            {(v) => (
              <CardGit>
                <Row space="2">
                  <CardGitLink target="_blank" href={v().url}>
                    <CardGitIcon size="md">
                      <IconCommit />
                    </CardGitIcon>
                    <CardGitCommit>
                      {formatCommit(v().trigger.commit.id)}
                    </CardGitCommit>
                  </CardGitLink>
                  <CardGitLink target="_blank" href={v().url}>
                    <CardGitIcon size="sm">
                      <Switch>
                        <Match when={v().trigger.type === "pull_request"}>
                          <IconPr />
                        </Match>
                        <Match when={v().trigger.type === "branch"}>
                          <IconGit />
                        </Match>
                      </Switch>
                    </CardGitIcon>
                    <CardGitBranch>
                      {(() => {
                        const trigger = v().trigger;
                        if (trigger.type === "branch") return trigger.branch;
                        return trigger.base;
                      })()}
                    </CardGitBranch>
                  </CardGitLink>
                </Row>
                <CardGitMessage>{v().trigger.commit.message}</CardGitMessage>
              </CardGit>
            )}
          </Show>
          <Stack space="px">
            <CardRegion>{props.stage.region}</CardRegion>
            <Tag>{aws.value?.accountID}</Tag>
          </Stack>
        </CardBodyRight>
      </CardRoot>
    );
  }

  return (
    <>
      <Header app={app.app.name} />
      <PageHeader>
        <Row space="5" vertical="center">
          <Link href="">
            <TabTitle size="sm">Stages</TabTitle>
          </Link>
          <Link href="autodeploy">
            <TabTitle size="sm" count={latestRunError.value ? "•" : ""}>
              Autodeploy
            </TabTitle>
          </Link>
          <Link href="settings">
            <TabTitle size="sm">Settings</TabTitle>
          </Link>
        </Row>
        <Show
          when={ghRepoOrg()}
          fallback={
            <Link href="settings#repo">
              <Button color="github" size="sm">
                <ButtonIcon size="sm">
                  <IconGitHub />
                </ButtonIcon>
                Connect Repo
              </Button>
            </Link>
          }
        >
          <Stack space="2" horizontal="end">
            <RepoLink
              target="_blank"
              href={`https://github.com/${ghRepoOrg()?.login}/${
                ghRepo()?.name
              }`}
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
        </Show>
      </PageHeader>
      <Root>
        <Stages>
          <For each={stages.value}>{(stage) => <Card stage={stage} />}</For>
        </Stages>
      </Root>
    </>
  );
}
