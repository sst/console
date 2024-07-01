import { pipe, filter, sortBy } from "remeda";
import { DateTime } from "luxon";
import { Row } from "$/ui/layout";
import { Link } from "@solidjs/router";
import { styled } from "@macaron-css/solid";
import { useAppContext } from "../context";
import { Stack, theme, utility } from "$/ui";
import { IconArrowLongRight, IconExclamationTriangle } from "$/ui/icons";
import { inputFocusStyles } from "$/ui/form";
import type { Run } from "@console/core/run";
import { globalKeyframes } from "@macaron-css/core";
import { IconPr, IconGit, IconCommit } from "$/ui/icons/custom";
import { formatCommit, formatSinceTime } from "$/common/format";
import { createSubscription } from "$/providers/replicache";
import {
  githubPr,
  githubRepo,
  githubBranch,
  githubCommit,
} from "$/common/url-builder";
import { RunStore } from "$/data/app";
import { StageStore } from "$/data/stage";
import { For, Show, Match, Switch, createMemo } from "solid-js";

export function ERROR_MAP(error: Exclude<Run.Run["error"], undefined>) {
  switch (error.type) {
    case "config_not_found":
      return "`sst.config.ts` was found in the repo root";
    case "config_build_failed":
      return "Failed to compile `sst.config.ts`";
    case "config_parse_failed":
      return "Failed to run `sst.config.ts`";
    case "config_evaluate_failed":
      return "Error evaluating `sst.config.ts`";
    case "config_target_returned_undefined":
      return "`console.autodeploy.target` returned `undefined`";
    case "config_branch_remove_skipped":
      return "Skipped branch remove";
    case "config_target_no_stage":
      return "`console.autodeploy.target` did not return a stage";
    case "config_v2_unsupported":
      return "Autodeploy does not support SST v2 apps";
    case "config_app_name_mismatch":
      return `\`sst.config.ts\` is for app \`${error.properties?.name}\``;
    case "target_not_found":
      return "Add an environment in your app settings";
    case "target_not_matched":
      return `No matching envrionments for \`${error.properties?.stage}\` in the app settings`;
    case "target_missing_aws_account":
      return `No AWS account for \`${error.properties?.target}\` in the app settings`;
    case "target_missing_workspace":
      return `AWS account for \`${error.properties?.target}\` is not configured`;
    case "run_failed":
      return error.properties?.message || "Error running `sst deploy`";
    case "unknown":
      return (
        error.properties?.message || "Deploy failed before running `sst deploy`"
      );
    default:
      return "Error running this deploy";
  }
}

export const STATUS_MAP = {
  queued: "Queued",
  skipped: "Skipped",
  updated: "Deployed",
  error: "Failed",
  updating: "In Progress",
};

const Content = styled("div", {
  base: {
    padding: theme.space[4],
  },
});

const EmptyRunsSign = styled("div", {
  base: {
    ...utility.stack(5),
    alignItems: "center",
    justifyContent: "center",
    height: 300,
    padding: `0 ${theme.space[4]}`,
  },
});

const EmptyRunsHelper = styled("div", {
  base: {
    ...utility.stack(5),
    color: theme.color.text.dimmed.base,
  },
});

const EmptyRunsHelperHeader = styled("span", {
  base: {
    textAlign: "center",
    marginLeft: theme.space[3.5],
    marginRight: theme.space[3.5],
    paddingBottom: theme.space[5],
    borderBottom: `2px dashed ${theme.color.divider.base}`,
    fontSize: theme.font.size.lg,
  },
});

const EmptyRunsHint = styled("ul", {
  base: {
    ...utility.stack(3),
    paddingLeft: 30,
    listStyle: "circle",
    fontSize: theme.font.size.base,
  },
});

const EmptyRunsHintCode = styled("span", {
  base: {
    fontSize: theme.font.size.mono_base,
    fontFamily: theme.font.family.code,
  },
});

const RunRoot = styled("div", {
  base: {
    ...utility.row(4),
    justifyContent: "space-between",
    padding: theme.space[4],
    alignItems: "center",
    borderStyle: "solid",
    borderWidth: "0 1px 1px 1px",
    borderColor: theme.color.divider.base,
    position: "relative",
    ":first-child": {
      borderWidth: 1,
      borderTopLeftRadius: theme.borderRadius,
      borderTopRightRadius: theme.borderRadius,
    },
    ":last-child": {
      borderBottomLeftRadius: theme.borderRadius,
      borderBottomRightRadius: theme.borderRadius,
    },
    selectors: {
      "&[data-focus='true']": {
        ...inputFocusStyles,
        outlineOffset: -1,
      },
    },
  },
});

const RunLeftCol = styled("div", {
  base: {
    ...utility.row(2),
    minWidth: 0,
    alignItems: "center",
    justifyContent: "space-between",
  },
});

const RunStatus = styled("div", {
  base: {
    ...utility.row(3),
    minWidth: 0,
    width: 120,
    alignItems: "center",
  },
});

export const RunStatusIcon = styled("div", {
  base: {
    width: 12,
    height: 12,
    borderRadius: "50%",
  },
  variants: {
    status: {
      skipped: {
        backgroundColor: theme.color.divider.base,
      },
      queued: {
        backgroundColor: theme.color.divider.base,
      },
      updated: {
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

globalKeyframes("glow-pulse-status", {
  "0%": {
    opacity: 0.3,
    filter: `drop-shadow(0 0 0px ${theme.color.accent})`,
  },
  "50%": {
    opacity: 1,
    filter: `drop-shadow(0 0 1px ${theme.color.accent})`,
  },
  "100%": {
    opacity: 0.3,
    filter: `drop-shadow(0 0 0px ${theme.color.accent})`,
  },
});

const RunLink = styled(Link, {
  base: {
    fontWeight: theme.font.weight.medium,
  },
  variants: {
    error: {
      true: {
        color: theme.color.text.danger.base,
        ":hover": {
          color: `hsla(${theme.color.red.d1}, 90%)`,
        },
      },
    },
  },
});

const RunMessage = styled("div", {
  base: {
    ...utility.row(0),
    gap: 5,
    alignItems: "center",
    lineHeight: 0,
  },
});

const RunMessageIcon = styled("div", {
  base: {
    opacity: theme.iconOpacity,
    color: theme.color.text.secondary.base,
  },
});

const RunMessageCopy = styled("p", {
  base: {
    ...utility.text.line,
    lineHeight: "normal",
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary.base,
  },
});

const RunMessageLink = styled(Link, {
  base: {
    fontSize: theme.font.size.sm,
  },
});

const RunGit = styled("div", {
  base: {
    ...utility.row(2),
    alignItems: "center",
    width: 420,
  },
});

const RunGitLink = styled("a", {
  base: {
    ...utility.row(1),
    alignItems: "center",
  },
});

const RunGitIcon = styled("span", {
  base: {
    lineHeight: 0,
    color: theme.color.icon.secondary,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${RunGitLink}:hover &`]: {
        color: theme.color.text.primary.base,
      },
    },
  },
  variants: {
    size: {
      sm: {
        width: 12,
        height: 12,
        color: theme.color.icon.dimmed,
        selectors: {
          [`${RunGitLink}:hover &`]: {
            color: theme.color.icon.secondary,
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

const RunGitBranch = styled("span", {
  base: {
    ...utility.text.line,
    maxWidth: 140,
    lineHeight: "normal",
    fontSize: theme.font.size.sm,
    color: theme.color.text.dimmed.base,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${RunGitLink}:hover &`]: {
        color: theme.color.text.secondary.base,
      },
    },
  },
});

const RunGitCommit = styled("span", {
  base: {
    lineHeight: "normal",
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_base,
    color: theme.color.text.secondary.base,
    fontWeight: theme.font.weight.medium,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${RunGitLink}:hover &`]: {
        color: theme.color.text.primary.base,
      },
    },
  },
});

const RunGitMessage = styled("p", {
  base: {
    ...utility.text.line,
    lineHeight: "normal",
    maxWidth: 260,
    fontSize: theme.font.size.xs,
    color: theme.color.text.dimmed.base,
  },
});

const RunRightCol = styled("div", {
  base: {
    ...utility.row(20),
    minWidth: 0,
    alignItems: "center",
    justifyContent: "space-between",
  },
});

const RunInfo = styled("div", {
  base: {
    ...utility.row(1),
    minWidth: 0,
    alignItems: "center",
  },
});

const RunSource = styled("div", {
  base: {
    ...utility.stack(2.5),
    width: 120,
  },
});

const RunTime = styled("span", {
  base: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.dimmed.base,
  },
});

const RunSenderAvatar = styled("div", {
  base: {
    flex: "0 0 auto",
    width: 24,
    height: 24,
    overflow: "hidden",
    borderRadius: theme.borderRadius,
  },
});

function RunItem({ run }: { run: Run.Run }) {
  const stage = createSubscription(async (tx) => {
    if (!run.stageID) return;
    return await StageStore.get(tx, run.stageID);
  });

  const runInfo = createMemo(() => {
    const trigger = run.trigger;
    const repoURL =
      trigger.source === "github"
        ? githubRepo(trigger.repo.owner, trigger.repo.repo)
        : "";
    const branch =
      trigger.type === "branch" ? trigger.branch : `pr#${trigger.number}`;
    const uri =
      trigger.type === "branch"
        ? githubBranch(repoURL, trigger.branch)
        : githubPr(repoURL, trigger.number);

    return { trigger, repoURL, branch, uri };
  });

  const status = createMemo(() =>
    run.time.completed
      ? run.error
        ? "error"
        : "updated"
      : run.error
        ? run.error.type === "config_branch_remove_skipped" ||
          run.error.type === "config_target_returned_undefined" ||
          run.error.type === "target_not_matched"
          ? "skipped"
          : "error"
        : run.active
          ? "updating"
          : "queued"
  );

  return (
    <RunRoot>
      <RunLeftCol>
        <RunStatus>
          <RunStatusIcon status={status()} />
          <RunLink href={run.id} error={status() === "error"}>
            {STATUS_MAP[status()!]}
          </RunLink>
        </RunStatus>
        <RunMessage>
          <Switch>
            <Match when={run.error}>
              <>
                <RunMessageIcon>
                  <IconExclamationTriangle width="14" height="14" />
                </RunMessageIcon>
                <RunMessageCopy>{ERROR_MAP(run.error!)}</RunMessageCopy>
              </>
            </Match>
            <Match when={stage.value}>
              <RunMessageIcon>
                <IconArrowLongRight width="12" height="12" />
              </RunMessageIcon>
              <RunMessageLink href={`../${stage.value?.name!}`}>
                {stage.value?.name}
              </RunMessageLink>
            </Match>
          </Switch>
        </RunMessage>
      </RunLeftCol>
      <RunRightCol>
        <RunGit>
          <RunGitLink
            target="_blank"
            href={githubCommit(
              runInfo()!.repoURL,
              runInfo()!.trigger.commit.id
            )}
          >
            <RunGitIcon size="md">
              <IconCommit />
            </RunGitIcon>
            <RunGitCommit>
              {formatCommit(runInfo()!.trigger.commit.id)}
            </RunGitCommit>
          </RunGitLink>
          <RunGitLink target="_blank" href={runInfo()!.uri}>
            <RunGitIcon size="sm">
              <Switch>
                <Match when={runInfo()!.trigger.type === "pull_request"}>
                  <IconPr />
                </Match>
                <Match when={true}>
                  <IconGit />
                </Match>
              </Switch>
            </RunGitIcon>
            <RunGitBranch>{runInfo()!.branch}</RunGitBranch>
          </RunGitLink>
          <Show when={runInfo()!.trigger.commit.message}>
            <RunGitMessage>{runInfo()!.trigger.commit.message}</RunGitMessage>
          </Show>
        </RunGit>
        <RunInfo>
          <RunSource>
            <Show when={run.time.created} fallback={<RunTime>—</RunTime>}>
              <RunTime
                title={DateTime.fromISO(run.time.created!).toLocaleString(
                  DateTime.DATETIME_FULL
                )}
              >
                {formatSinceTime(DateTime.fromISO(run.time.created!).toSQL()!)}
              </RunTime>
            </Show>
          </RunSource>
          <RunSenderAvatar title={runInfo()!.trigger.sender.username}>
            <img
              width="24"
              height="24"
              src={`https://avatars.githubusercontent.com/u/${runInfo()!.trigger.sender.id
                }?s=48&v=4`}
            />
          </RunSenderAvatar>
        </RunInfo>
      </RunRightCol>
    </RunRoot>
  );
}

export function List() {
  const ctx = useAppContext();
  const runs = createSubscription(async (tx) => {
    const all = await RunStore.all(tx);

    return pipe(
      all,
      filter((run) => run.appID === ctx.app.id),
      sortBy([(run) => run.time.created, "desc"])
    );
  });

  return (
    <Content>
      <Show when={runs.value && runs.value.length === 0}>
        <EmptyRunsSign>
          <EmptyRunsHelper>
            <EmptyRunsHelperHeader>Autodeploy your app</EmptyRunsHelperHeader>
            <EmptyRunsHint>
              <li>Connect your app to its GitHub repo</li>
              <li>
                Add an envrionment for your{" "}
                <EmptyRunsHintCode>`production`</EmptyRunsHintCode>{" "}
                branch
              </li>
              <li>
                Git push to deploy{" "}
                <EmptyRunsHintCode>
                  `git push origin main:production`
                </EmptyRunsHintCode>
              </li>
            </EmptyRunsHint>
          </EmptyRunsHelper>
        </EmptyRunsSign>
      </Show>
      <For each={runs.value}>{(run) => <RunItem run={run} />}</For>
    </Content>
  );
}
