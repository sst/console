import { sortBy } from "remeda";
import { DateTime } from "luxon";
import { Row } from "$/ui/layout";
import { Link } from "@solidjs/router";
import { styled } from "@macaron-css/solid";
import { State } from "@console/core/state";
import { useStageContext } from "../context";
import { Stack, theme, utility } from "$/ui";
import { IconCommandLine } from "$/ui/icons";
import { inputFocusStyles } from "$/ui/form";
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
import { RunStore, StateUpdateStore } from "$/data/app";
import { For, Show, Match, Switch, createMemo } from "solid-js";

const LEGEND_RES = 2;
const LEGEND_WIDTH = 160;

export const CMD_MAP = {
  deploy: "sst deploy",
  refresh: "sst refresh",
  remove: "sst remove",
  edit: "sst state edit",
};

export const STATUS_MAP = {
  queued: "Queued",
  canceled: "Canceled",
  updated: "Complete",
  error: "Error",
  updating: "In Progress",
};

const Content = styled("div", {
  base: {
    padding: theme.space[4],
  },
});

const UpdateRoot = styled("div", {
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

const UpdateLeftCol = styled("div", {
  base: {
    ...utility.row(10),
    minWidth: 0,
    alignItems: "center",
    justifyContent: "space-between",
  },
});

const UpdateStatus = styled("div", {
  base: {
    ...utility.row(4),
    minWidth: 0,
    width: 120,
    alignItems: "center",
  },
});

export const UpdateStatusIcon = styled("div", {
  base: {
    width: 12,
    height: 12,
    borderRadius: "50%",
  },
  variants: {
    status: {
      queued: {
        backgroundColor: theme.color.divider.base,
      },
      canceled: {
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

const UpdateLink = styled(Link, {
  base: {
    fontWeight: theme.font.weight.medium,
  },
});

const UpdateLinkPrefix = styled("span", {
  base: {
    marginRight: 1,
    fontWeight: theme.font.weight.regular,
    fontSize: theme.font.size.sm,
  },
});

const UpdateStatusCopy = styled("p", {
  base: {
    fontSize: theme.font.size.xs,
    color: theme.color.text.dimmed.base,
  },
});

const UpdateGit = styled("div", {
  base: {
    ...utility.stack(1.5),
  },
});

const UpdateGitLink = styled("a", {
  base: {
    ...utility.row(1),
    alignItems: "center",
  },
});

const UpdateGitIcon = styled("span", {
  base: {
    lineHeight: 0,
    color: theme.color.icon.secondary,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${UpdateGitLink}:hover &`]: {
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
          [`${UpdateGitLink}:hover &`]: {
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

const UpdateGitBranch = styled("span", {
  base: {
    ...utility.text.line,
    maxWidth: 140,
    lineHeight: "normal",
    fontSize: theme.font.size.sm,
    color: theme.color.text.dimmed.base,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${UpdateGitLink}:hover &`]: {
        color: theme.color.text.secondary.base,
      },
    },
  },
});

const UpdateGitCommit = styled("span", {
  base: {
    lineHeight: "normal",
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_base,
    color: theme.color.text.secondary.base,
    fontWeight: theme.font.weight.medium,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${UpdateGitLink}:hover &`]: {
        color: theme.color.text.primary.base,
      },
    },
  },
});

const UpdateGitMessage = styled("span", {
  base: {
    ...utility.text.line,
    lineHeight: "normal",
    maxWidth: 260,
    fontSize: theme.font.size.xs,
    color: theme.color.text.dimmed.base,
  },
});

const UpdateRightCol = styled("div", {
  base: {
    ...utility.row(20),
    minWidth: 0,
    alignItems: "center",
    justifyContent: "space-between",
  },
});

const UpdateCmd = styled("span", {
  base: {
    fontSize: theme.font.size.mono_sm,
    fontWeight: theme.font.weight.medium,
    fontFamily: theme.font.family.code,
    color: theme.color.text.secondary.base,
  },
});

const ChangeLegendRoot = styled("div", {
  base: {
    ...utility.row("px"),
  },
  variants: {
    empty: {
      true: {
        height: 16,
        width: LEGEND_WIDTH,
        borderRadius: 2,
        backgroundSize: "4px 4px",
        backgroundColor: "transparent",
        border: `1px solid ${theme.color.background.surface}`,
        backgroundImage: `repeating-linear-gradient(
          45deg,
          ${theme.color.background.selected} 0,
          ${theme.color.background.selected} 1px,
          transparent 0,
          transparent 50%
        )`,
      },
    },
  },
});

const ChangeLegendTag = styled("div", {
  base: {
    height: 16,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    textTransform: "uppercase",
    userSelect: "none",
    WebkitUserSelect: "none",
    fontWeight: theme.font.weight.semibold,
    justifyContent: "center",
    fontSize: "0.625rem",
    ":first-child": {
      borderTopLeftRadius: 2,
      borderBottomLeftRadius: 2,
    },
    ":last-child": {
      borderTopRightRadius: 2,
      borderBottomRightRadius: 2,
    },
  },
  variants: {
    type: {
      created: {
        backgroundColor: `hsla(${theme.color.blue.l2}, 100%)`,
      },
      deleted: {
        backgroundColor: `hsla(${theme.color.red.l1}, 100%)`,
      },
      updated: {
        backgroundColor: `hsla(${theme.color.brand.l2}, 100%)`,
      },
      same: {
        backgroundColor: theme.color.divider.base,
      },
    },
  },
});

const UpdateInfo = styled("div", {
  base: {
    ...utility.row(1),
    minWidth: 0,
    alignItems: "center",
  },
});

const UpdateSource = styled("div", {
  base: {
    ...utility.stack(2.5),
    width: 120,
  },
});

const UpdateSourceType = styled("span", {
  base: {
    ...utility.text.label,
    fontSize: theme.font.size.mono_sm,
    color: theme.color.text.secondary.base,
  },
});

const UpdateTime = styled("span", {
  base: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.dimmed.base,
  },
});

const UpdateSenderAvatar = styled("div", {
  base: {
    flex: "0 0 auto",
    width: 24,
    height: 24,
    overflow: "hidden",
    borderRadius: theme.borderRadius,
  },
});

const UpdateSenderIcon = styled("div", {
  base: {
    flex: "0 0 auto",
    width: 24,
    height: 24,
    color: theme.color.icon.dimmed,
  },
});

type UpdateProps = {
  id: string;
  index: string;
  errors?: any[];
  timeStarted?: string;
  source: State.Update["source"];
  resourceSame?: number;
  timeCanceled?: string;
  timeCompleted?: string;
  same?: number;
  created?: number;
  updated?: number;
  deleted?: number;
  command: "deploy" | "refresh" | "remove" | "edit";
};
function Update(props: UpdateProps) {
  const ctx = useStageContext();
  const errors = () => props.errors?.length || 0;
  const runID = props.source.type === "ci" && props.source.properties.runID;

  const run = createSubscription(async (tx) => {
    if (!runID) return;
    return RunStore.get(tx, ctx.stage.id, runID);
  });

  const runInfo = createMemo(() => {
    if (!run.value) return;

    const trigger = run.value.trigger;
    const repoURL =
      trigger.source === "github"
        ? githubRepo(trigger.repo.owner, trigger.repo.repo)
        : "";
    const branch =
      trigger.type === "push" ? trigger.branch : `pr#${trigger.number}`;
    const uri =
      trigger.type === "push"
        ? githubBranch(repoURL, trigger.branch)
        : githubPr(repoURL, trigger.number);

    return { trigger, repoURL, branch, uri };
  });

  const status = createMemo(() =>
    props.timeCompleted
      ? errors()
        ? "error"
        : "updated"
      : props.timeCanceled
        ? "canceled"
        : run.value && !run.value.active
          ? "queued"
          : "updating",
  );

  return (
    <UpdateRoot>
      <UpdateLeftCol>
        <UpdateStatus>
          <UpdateStatusIcon status={status()} />
          <Stack space="2.5">
            <UpdateLink href={props.id}>
              <UpdateLinkPrefix>#</UpdateLinkPrefix>
              {props.index}
            </UpdateLink>
            <UpdateStatusCopy>
              {status() === "error"
                ? errorCountCopy(errors())
                : STATUS_MAP[status()]}
            </UpdateStatusCopy>
          </Stack>
        </UpdateStatus>
        <Show when={runInfo()}>
          <UpdateGit>
            <Row space="2">
              <UpdateGitLink
                target="_blank"
                href={githubCommit(
                  runInfo()!.repoURL,
                  runInfo()!.trigger.commit.id,
                )}
              >
                <UpdateGitIcon size="md">
                  <IconCommit />
                </UpdateGitIcon>
                <UpdateGitCommit>
                  {formatCommit(runInfo()!.trigger.commit.id)}
                </UpdateGitCommit>
              </UpdateGitLink>
              <UpdateGitLink target="_blank" href={runInfo()!.uri}>
                <UpdateGitIcon size="sm">
                  <Switch>
                    <Match when={runInfo()!.trigger.type === "pull_request"}>
                      <IconPr />
                    </Match>
                    <Match when={true}>
                      <IconGit />
                    </Match>
                  </Switch>
                </UpdateGitIcon>
                <UpdateGitBranch>{runInfo()!.branch}</UpdateGitBranch>
              </UpdateGitLink>
            </Row>
            <UpdateGitMessage>
              <Show when={runInfo()!.trigger.commit.message} fallback="—">
                {runInfo()!.trigger.commit.message}
              </Show>
            </UpdateGitMessage>
          </UpdateGit>
        </Show>
      </UpdateLeftCol>
      <UpdateRightCol>
        <Stack space="2.5">
          <UpdateCmd>{CMD_MAP[props.command]}</UpdateCmd>
          <ChangeLegend
            same={props.same}
            created={props.created}
            updated={props.updated}
            deleted={props.deleted}
          />
        </Stack>
        <UpdateInfo>
          <UpdateSource>
            <Show
              when={props.timeStarted}
              fallback={<UpdateTime>—</UpdateTime>}
            >
              <UpdateTime
                title={DateTime.fromISO(props.timeStarted!).toLocaleString(
                  DateTime.DATETIME_FULL,
                )}
              >
                {formatSinceTime(DateTime.fromISO(props.timeStarted!).toSQL()!)}
              </UpdateTime>
            </Show>
          </UpdateSource>
          <Switch>
            <Match when={run.value!}>
              <UpdateSenderAvatar title={runInfo()!.trigger.sender.username}>
                <img
                  width="24"
                  height="24"
                  src={`https://avatars.githubusercontent.com/u/${
                    runInfo()!.trigger.sender.id
                  }?s=48&v=4`}
                />
              </UpdateSenderAvatar>
            </Match>
            <Match when={props.source.type === "cli"}>
              <UpdateSenderIcon title="From the CLI">
                <IconCommandLine />
              </UpdateSenderIcon>
            </Match>
          </Switch>
        </UpdateInfo>
      </UpdateRightCol>
    </UpdateRoot>
  );
}

type ChangeLegendProps = {
  same?: number;
  created?: number;
  updated?: number;
  deleted?: number;
};
function ChangeLegend(props: ChangeLegendProps) {
  const same = () => props.same! ?? 0;
  const created = () => props.created! ?? 0;
  const updated = () => props.updated! ?? 0;
  const deleted = () => props.deleted! ?? 0;

  const total = () => same() + created() + updated() + deleted();

  const widths = createMemo(() => {
    const nonZero = [same(), created(), updated(), deleted()].filter(
      (n) => n !== 0,
    ).length;

    let sameWidth =
      Math.ceil(((same() / total()) * LEGEND_WIDTH) / LEGEND_RES) * LEGEND_RES;
    let createdWidth =
      Math.ceil(((created() / total()) * LEGEND_WIDTH) / LEGEND_RES) *
      LEGEND_RES;
    let updatedWidth =
      Math.ceil(((updated() / total()) * LEGEND_WIDTH) / LEGEND_RES) *
      LEGEND_RES;
    let deletedWidth =
      Math.ceil(((deleted() / total()) * LEGEND_WIDTH) / LEGEND_RES) *
      LEGEND_RES;

    const calculatedTotalWidth =
      sameWidth + createdWidth + updatedWidth + deletedWidth;
    const widthDifference = LEGEND_WIDTH - (nonZero - 1 + calculatedTotalWidth);

    if (widthDifference !== 0) {
      const maxWidth = Math.max(
        sameWidth,
        createdWidth,
        updatedWidth,
        deletedWidth,
      );
      if (maxWidth === sameWidth) {
        sameWidth += widthDifference;
      } else if (maxWidth === createdWidth) {
        createdWidth += widthDifference;
      } else if (maxWidth === updatedWidth) {
        updatedWidth += widthDifference;
      } else if (maxWidth === deletedWidth) {
        deletedWidth += widthDifference;
      }
    }
    return {
      same: sameWidth,
      created: createdWidth,
      updated: updatedWidth,
      deleted: deletedWidth,
    };
  });

  return (
    <ChangeLegendRoot
      empty={total() === 0}
      title={total() === 0 ? "No changes" : undefined}
    >
      <Show when={deleted() !== 0}>
        <ChangeLegendTag
          type="deleted"
          title={`${deleted()} deleted`}
          style={{ width: `${widths().deleted}px` }}
        />
      </Show>
      <Show when={created() !== 0}>
        <ChangeLegendTag
          type="created"
          title={`${created()} added`}
          style={{ width: `${widths().created}px` }}
        />
      </Show>
      <Show when={updated() !== 0}>
        <ChangeLegendTag
          type="updated"
          title={`${updated()} updated`}
          style={{ width: `${widths().updated}px` }}
        />
      </Show>
      <Show when={same() !== 0}>
        <ChangeLegendTag
          type="same"
          title={`${same()} unchanged`}
          style={{ width: `${widths().same}px` }}
        />
      </Show>
    </ChangeLegendRoot>
  );
}

export function List() {
  const ctx = useStageContext();
  const updates = createSubscription(
    (tx) => StateUpdateStore.forStage(tx, ctx.stage.id),
    [],
  );

  return (
    <Content>
      <div>
        <For each={sortBy(updates.value, [(item) => item.index, "desc"])}>
          {(item) => (
            <Update
              id={item.id}
              index={item.index}
              errors={item.errors}
              command={item.command}
              source={item.source}
              same={item.resource.same}
              created={item.resource.created}
              updated={item.resource.updated}
              deleted={item.resource.deleted}
              timeStarted={item.time.started}
              timeCompleted={item.time.completed}
            />
          )}
        </For>
      </div>
    </Content>
  );
}

export function countCopy(count?: number) {
  return count! > 1 ? `${count} resources` : "1 resource";
}

export function errorCountCopy(count?: number) {
  return count! > 1 ? `${count} errors` : "Error";
}
