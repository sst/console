import {
  For,
  Show,
  Match,
  Switch,
  createMemo,
  createEffect,
  createSignal,
  onMount,
  createResource,
  onCleanup,
} from "solid-js";
import { useReplicache } from "$/providers/replicache";
import { Link, useParams } from "@solidjs/router";
import { RunStore, StateUpdateStore, StateEventStore } from "$/data/app";
import { State } from "@console/core/state";
import { DateTime } from "luxon";
import { Dropdown } from "$/ui/dropdown";
import { useStageContext } from "../context";
import { CMD_MAP, STATUS_MAP, errorCountCopy, UpdateStatusIcon } from "./list";
import {
  LogsLoading,
  LogsLoadingIcon,
  PanelEmptyCopy,
  LogsBackground,
} from "../issues/detail";
import { NotFound } from "$/pages/not-found";
import { inputFocusStyles } from "$/ui/form";
import { styled } from "@macaron-css/solid";
import {
  IconPr,
  IconGit,
  IconCommit,
  IconArrowPathSpin,
} from "$/ui/icons/custom";
import { Log, LogTime, LogMessage } from "$/common/invocation";
import { formatDuration, formatSinceTime } from "$/common/format";
import { useReplicacheStatus } from "$/providers/replicache-status";
import { IconCheck, IconXCircle, IconEllipsisVertical } from "$/ui/icons";
import {
  githubPr,
  githubRepo,
  githubBranch,
  githubCommit,
} from "$/common/url-builder";
import { Row, Tag, Text, Stack, theme, utility } from "$/ui";
import { sortBy } from "remeda";
import { useWorkspace } from "../../context";
import { useAuth2 } from "$/providers/auth2";

const DATETIME_NO_TIME = {
  month: "short",
  day: "numeric",
  year: "numeric",
} as const;

const AVATAR_SIZE = 36;
const SIDEBAR_WIDTH = 300;
const RES_LEFT_BORDER = "4px";

const Container = styled("div", {
  base: {
    ...utility.row(6),
    padding: theme.space[4],
  },
});

const Content = styled("div", {
  base: {
    minWidth: 0,
    flex: "1 1 auto",
  },
});

const PageTitle = styled("div", {
  base: {
    ...utility.row(3.5),
    alignItems: "center",
  },
});

const PageTitleCopy = styled("h1", {
  base: {
    fontSize: theme.font.size["xl"],
    fontWeight: theme.font.weight.medium,
  },
});

const PageTitlePrefix = styled("span", {
  base: {
    marginRight: 1,
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_lg,
    fontWeight: theme.font.weight.medium,
  },
});

const PageTitleStatus = styled("p", {
  base: {
    marginLeft: `calc(${theme.space[3.5]} + 12px)`,
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary.base,
  },
});

const Errors = styled("div", {
  base: {
    ...utility.stack(4),
    padding: theme.space[4],
    borderRadius: theme.borderRadius,
    backgroundColor: theme.color.background.red,
  },
});

const Error = styled("div", {
  base: {
    ...utility.row(2),
    color: `hsla(${theme.color.red.l2}, 100%)`,
  },
});

const ErrorIcon = styled("div", {
  base: {
    flex: 0,
    marginTop: 2,
  },
});

const ErrorTitle = styled("div", {
  base: {
    fontSize: theme.font.size.mono_sm,
    fontFamily: theme.font.family.code,
    fontWeight: theme.font.weight.bold,
    lineHeight: theme.font.lineHeight,
    wordBreak: "break-all",
  },
});

const ErrorMessage = styled("div", {
  base: {
    fontSize: theme.font.size.sm,
    lineHeight: theme.font.lineHeight,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
});

const ResourceEmpty = styled("div", {
  base: {
    height: 200,
    border: `1px solid ${theme.color.divider.base}`,
    borderRadius: theme.borderRadius,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: theme.color.text.dimmed.base,
  },
});

const ResourceRoot = styled("div", {
  base: {
    borderRadius: theme.borderRadius,
    borderStyle: "solid",
    borderWidth: `1px 1px 1px ${RES_LEFT_BORDER}`,
    borderColor: theme.color.divider.base,
  },
  variants: {
    action: {
      created: {
        borderLeftColor: `hsla(${theme.color.blue.l2}, 100%)`,
      },
      updated: {
        borderLeftColor: `hsla(${theme.color.brand.l2}, 100%)`,
      },
      deleted: {
        borderLeftColor: `hsla(${theme.color.red.l1}, 100%)`,
      },
      same: {
        borderLeftColor: theme.color.divider.base,
      },
    },
  },
});

const ResourceChild = styled("div", {
  base: {
    ...utility.row(4),
    justifyContent: "space-between",
    padding: `${theme.space[4]} ${theme.space[4]} ${theme.space[4]} calc(${theme.space[4]} - ${RES_LEFT_BORDER} + 1px)`,
    alignItems: "center",
    borderBottom: `1px solid ${theme.color.divider.base}`,
    position: "relative",
    ":last-child": {
      borderBottom: 0,
    },
    selectors: {
      "&[data-focus='true']": {
        ...inputFocusStyles,
        outlineOffset: -1,
      },
    },
  },
});

const ResourceChildEmpty = styled("div", {
  base: {
    padding: `${theme.space[4]} ${theme.space[4]} ${theme.space[4]} calc(${theme.space[4]} - ${RES_LEFT_BORDER} + 1px)`,
    color: theme.color.text.dimmed.base,
    fontSize: theme.font.size.sm,
    lineHeight: "normal",
  },
});

const ResourceKey = styled("span", {
  base: {
    ...utility.text.line,
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_base,
    lineHeight: "normal",
    minWidth: "33%",
  },
});

const ResourceValue = styled("span", {
  base: {
    ...utility.text.line,
    fontSize: theme.font.size.sm,
    color: theme.color.text.dimmed.base,
    lineHeight: "normal",
  },
});

const ResourceCopyButton = styled("button", {
  base: {
    flexShrink: 0,
    height: 16,
    width: 16,
    color: theme.color.icon.dimmed,
    ":hover": {
      color: theme.color.icon.secondary,
    },
  },
  variants: {
    copying: {
      true: {
        cursor: "default",
        color: theme.color.accent,
        ":hover": {
          color: theme.color.accent,
        },
      },
    },
  },
});

const Sidebar = styled("div", {
  base: {
    flex: "0 0 auto",
    width: SIDEBAR_WIDTH,
  },
});

const SidebarSpacer = styled("div", {
  base: {
    height: theme.space[1.5],
  },
});

const GitInfo = styled("div", {
  base: {
    ...utility.stack(2),
    justifyContent: "center",
    height: 44,
  },
});

const GitAvatar = styled("div", {
  base: {
    flex: "0 0 auto",
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    overflow: "hidden",
    borderRadius: theme.borderRadius,
  },
});

const GitLink = styled("a", {
  base: {
    ...utility.row(1),
    alignItems: "center",
  },
});

const GitIcon = styled("div", {
  base: {
    flex: "0 0 auto",
    lineHeight: 0,
    color: theme.color.icon.secondary,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${GitLink}:hover &`]: {
        color: theme.color.text.primary.base,
      },
    },
  },
  variants: {
    size: {
      sm: {
        marginInline: 1,
        width: 12,
        height: 12,
        color: theme.color.icon.dimmed,
        selectors: {
          [`${GitLink}:hover &`]: {
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

const GitCommit = styled("span", {
  base: {
    lineHeight: "normal",
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_base,
    color: theme.color.text.secondary.base,
    fontWeight: theme.font.weight.medium,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${GitLink}:hover &`]: {
        color: theme.color.text.primary.base,
      },
    },
  },
});

const GitBranch = styled("span", {
  base: {
    ...utility.text.line,
    maxWidth: SIDEBAR_WIDTH - AVATAR_SIZE - 24,
    lineHeight: "normal",
    fontSize: theme.font.size.sm,
    color: theme.color.text.dimmed.base,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${GitLink}:hover &`]: {
        color: theme.color.text.secondary.base,
      },
    },
  },
});

const PanelTitle = styled("span", {
  base: {
    ...utility.text.label,
    fontSize: theme.font.size.mono_sm,
    color: theme.color.text.dimmed.base,
  },
});

const PanelValueMono = styled("span", {
  base: {
    color: theme.color.text.secondary.base,
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_base,
    fontWeight: theme.font.weight.medium,
  },
});

export function Detail() {
  const params = useParams();
  const rep = useReplicache();
  const ctx = useStageContext();
  const replicacheStatus = useReplicacheStatus();
  const update = StateUpdateStore.get.watch(rep, () => [
    ctx.stage.id,
    params.updateID,
  ]);
  const resources = StateEventStore.forUpdate.watch(
    rep,
    () => [ctx.stage.id, params.updateID],
    (resources) => sortBy(resources, [(r) => getResourceName(r.urn)!, "asc"]),
  );

  const runID = createMemo(
    () =>
      update() &&
      update().source.type === "ci" &&
      (update().source.properties as { runID: string }).runID,
  );
  const run = RunStore.get.watch(rep, () => [
    ctx.stage.id,
    runID() || "unknown",
  ]);
  const repoURL = createMemo(() =>
    run() && run().trigger.source === "github"
      ? githubRepo(run().trigger.repo.owner, run().trigger.repo.repo)
      : "",
  );
  const workspace = useWorkspace();
  const auth = useAuth2();
  const [logs, logsAction] = createResource(
    () => run()?.log,
    async (log) => {
      if (!log) return [];
      const results = await fetch(
        import.meta.env.VITE_API_URL +
          "/rest/log/scan?" +
          new URLSearchParams(
            log.engine === "lambda"
              ? {
                  stageID: ctx.stage.id,
                  timestamp: log.timestamp.toString(),
                  logStream: log.logStream,
                  logGroup: log.logGroup,
                  requestID: log.requestID,
                }
              : {
                  stageID: ctx.stage.id,
                  logStream: log.logStream,
                  logGroup: log.logGroup,
                },
          ).toString(),
        {
          headers: {
            "x-sst-workspace": workspace().id,
            Authorization: "Bearer " + auth.current.token,
          },
        },
      ).then(
        (res) =>
          res.json() as Promise<
            {
              message: string;
              timestamp: number;
            }[]
          >,
      );
      return results;
    },
  );

  const logsPoller = setInterval(() => {
    if (!run()) return;
    if (logs()?.at(-1)?.message.includes("REPORT")) return;
    logsAction.refetch();
  }, 3000);
  onCleanup(() => clearInterval(logsPoller));

  const status = createMemo(() => {
    if (!update()) return;
    if (update().time.completed)
      return update().errors.length ? "error" : "updated";
    if (run() && !run().active) return "queued";
    return "updating";
  });
  const deleted = createMemo(() =>
    resources().filter((r) => r.action === "deleted"),
  );
  const created = createMemo(() =>
    resources().filter((r) => r.action === "created"),
  );
  const updated = createMemo(() =>
    resources().filter((r) => r.action === "updated"),
  );
  const isEmpty = createMemo(
    () =>
      update() &&
      !deleted().length &&
      !created().length &&
      !updated().length &&
      !update().resource.same,
  );

  function renderSidebar() {
    const runInfo = createMemo(() => {
      if (!run()) return;

      const trigger = run().trigger;
      const branch =
        trigger.type === "push" ? trigger.branch : `pr#${trigger.number}`;
      const uri =
        trigger.type === "push"
          ? githubBranch(repoURL(), trigger.branch)
          : githubPr(repoURL(), trigger.number);

      return { trigger, branch, uri };
    });
    return (
      <Sidebar>
        <Stack space={runInfo() ? "7" : "0"}>
          <Show when={runInfo()} fallback={<SidebarSpacer />}>
            <GitInfo>
              <Row space="1.5" vertical="center">
                <GitAvatar title={runInfo()!.trigger.sender.username}>
                  <img
                    width={AVATAR_SIZE}
                    height={AVATAR_SIZE}
                    src={`https://avatars.githubusercontent.com/u/${
                      runInfo()!.trigger.sender.id
                    }?s=${2 * AVATAR_SIZE}&v=4`}
                  />
                </GitAvatar>
                <Stack space="0.5">
                  <GitLink
                    target="_blank"
                    rel="noreferrer"
                    href={githubCommit(repoURL(), runInfo()!.trigger.commit.id)}
                  >
                    <GitIcon size="md">
                      <IconCommit />
                    </GitIcon>
                    <GitCommit>
                      {shortenCommit(runInfo()!.trigger.commit.id)}
                    </GitCommit>
                  </GitLink>
                  <GitLink
                    target="_blank"
                    rel="noreferrer"
                    href={runInfo()!.uri}
                  >
                    <GitIcon size="sm">
                      <Switch>
                        <Match
                          when={runInfo()!.trigger.type === "pull_request"}
                        >
                          <IconPr />
                        </Match>
                        <Match when={true}>
                          <IconGit />
                        </Match>
                      </Switch>
                    </GitIcon>
                    <GitBranch>{runInfo()!.branch}</GitBranch>
                  </GitLink>
                </Stack>
              </Row>
            </GitInfo>
          </Show>
          <Stack space="7">
            <Stack space="2">
              <PanelTitle>Started</PanelTitle>
              <Text
                color="secondary"
                title={
                  update().time.started
                    ? DateTime.fromISO(update().time.started!).toLocaleString(
                        DateTime.DATETIME_FULL,
                      )
                    : undefined
                }
              >
                {update().time.started
                  ? formatSinceTime(
                      DateTime.fromISO(update().time.started!).toSQL()!,
                      true,
                    )
                  : "—"}
              </Text>
            </Stack>
            <Stack space="2">
              <PanelTitle>Duration</PanelTitle>
              <Text
                color="secondary"
                title={
                  DateTime.fromISO(update().time.completed!)
                    .diff(DateTime.fromISO(update().time.started!))
                    .as("seconds") + " seconds"
                }
              >
                {update().time.started && update().time.completed
                  ? formatDuration(
                      DateTime.fromISO(update().time.completed!)
                        .diff(DateTime.fromISO(update().time.started!))
                        .as("milliseconds"),
                      true,
                    )
                  : "—"}
              </Text>
            </Stack>
            <Stack space="2">
              <PanelTitle>Command</PanelTitle>
              <PanelValueMono>{CMD_MAP[update().command]}</PanelValueMono>
            </Stack>
          </Stack>
        </Stack>
      </Sidebar>
    );
  }

  function renderResources() {
    return (
      <>
        <Show when={deleted().length}>
          <Stack space="2">
            <PanelTitle>Removed</PanelTitle>
            <ResourceRoot action="deleted">
              <For each={deleted()}>{(r) => <Resource {...r} />}</For>
            </ResourceRoot>
          </Stack>
        </Show>
        <Show when={created().length}>
          <Stack space="2">
            <PanelTitle>Added</PanelTitle>
            <ResourceRoot action="created">
              <For each={created()}>{(r) => <Resource {...r} />}</For>
            </ResourceRoot>
          </Stack>
        </Show>
        <Show when={updated().length}>
          <Stack space="2">
            <PanelTitle>Updated</PanelTitle>
            <ResourceRoot action="updated">
              <For each={updated()}>{(r) => <Resource {...r} />}</For>
            </ResourceRoot>
          </Stack>
        </Show>
        <Show when={update().resource.same! > 0}>
          <Stack space="2">
            <PanelTitle>Unchanged</PanelTitle>
            <ResourceRoot action="same">
              <ResourceChildEmpty>
                {countCopy(update().resource.same!)} were not changed
              </ResourceChildEmpty>
            </ResourceRoot>
          </Stack>
        </Show>
      </>
    );
  }

  function renderHeader() {
    return (
      <Stack space="2.5">
        <PageTitle>
          <UpdateStatusIcon status={status()} />
          <PageTitleCopy>
            Update <PageTitlePrefix>#</PageTitlePrefix>
            {update().index}
          </PageTitleCopy>
        </PageTitle>
        <PageTitleStatus>
          {status() === "error"
            ? errorCountCopy(update().errors.length)
            : STATUS_MAP[status()!]}
        </PageTitleStatus>
      </Stack>
    );
  }

  function renderErrors() {
    return (
      <Errors>
        <For each={update().errors}>
          {(err) => (
            <Error>
              <ErrorIcon>
                <IconXCircle width={16} height={16} />
              </ErrorIcon>
              <Stack space="0.5">
                <Show when={err.urn}>
                  <ErrorTitle>{getResourceName(err.urn)}</ErrorTitle>
                </Show>
                <ErrorMessage>{err.message}</ErrorMessage>
              </Stack>
            </Error>
          )}
        </For>
      </Errors>
    );
  }

  return (
    <Switch>
      <Match
        when={
          replicacheStatus.isSynced(rep().name) && !update() && update.ready
        }
      >
        <NotFound inset="stage" />
      </Match>
      <Match when={update()}>
        <Container>
          <Content>
            <Stack space="6">
              <Stack space="4">
                {renderHeader()}
                <Show when={update().errors.length}>{renderErrors()}</Show>
              </Stack>
              <Show when={run() && (run().active || run().time.completed)}>
                <Stack space="2">
                  <Show
                    when={logs.length}
                    fallback={<PanelTitle>Logs</PanelTitle>}
                  >
                    <PanelTitle
                      title={DateTime.fromMillis(logs()![0].timestamp!)
                        .toUTC()
                        .toLocaleString(DateTime.DATETIME_FULL)}
                    >
                      Logs —{" "}
                      {DateTime.fromMillis(
                        logs()![0].timestamp!,
                      ).toLocaleString(DATETIME_NO_TIME)}
                    </PanelTitle>
                  </Show>
                  <LogsBackground>
                    <Show
                      when={logs()?.length}
                      fallback={
                        <LogsLoading>
                          <LogsLoadingIcon>
                            <IconArrowPathSpin />
                          </LogsLoadingIcon>
                          <PanelEmptyCopy>
                            {update().time.completed
                              ? "Fetching logs"
                              : "Running"}{" "}
                            &hellip;
                          </PanelEmptyCopy>
                        </LogsLoading>
                      }
                    >
                      <For each={logs()!}>
                        {(entry) => (
                          <Log>
                            <LogTime
                              title={DateTime.fromMillis(entry.timestamp)
                                .toUTC()
                                .toLocaleString(
                                  DateTime.DATETIME_FULL_WITH_SECONDS,
                                )}
                            >
                              {DateTime.fromMillis(entry.timestamp).toFormat(
                                "HH:mm:ss.SSS",
                              )}
                            </LogTime>
                            <LogMessage>{entry.message}</LogMessage>
                          </Log>
                        )}
                      </For>
                    </Show>
                  </LogsBackground>
                </Stack>
              </Show>
              <Stack space="5">
                <Show
                  when={!isEmpty()}
                  fallback={
                    <ResourceEmpty>
                      <Show
                        fallback="No changes"
                        when={status() === "updating" || status() === "queued"}
                      >
                        Waiting for changes
                      </Show>
                    </ResourceEmpty>
                  }
                >
                  {renderResources()}
                </Show>
              </Stack>
            </Stack>
          </Content>
          {renderSidebar()}
        </Container>
      </Match>
    </Switch>
  );
}

function Resource(props: State.ResourceEvent) {
  const [copying, setCopying] = createSignal(false);
  const name = createMemo(() => getResourceName(props.urn));
  return (
    <ResourceChild>
      <ResourceKey>{name()}</ResourceKey>
      <Row space="3" vertical="center">
        <ResourceValue>{props.type}</ResourceValue>
        <Dropdown
          size="sm"
          disabled={copying()}
          icon={
            copying() ? (
              <IconCheck width={16} height={16} />
            ) : (
              <IconEllipsisVertical width={16} height={16} />
            )
          }
        >
          <Dropdown.Item
            onSelect={() => {
              setCopying(true);
              navigator.clipboard.writeText(props.urn);
              setTimeout(() => setCopying(false), 2000);
            }}
          >
            Copy URN
          </Dropdown.Item>
        </Dropdown>
      </Row>
    </ResourceChild>
  );
}

function countCopy(count?: number) {
  return count! > 1 ? `${count} resources` : "1 resource";
}

function getResourceName(urn: string) {
  return urn.split("::").at(-1);
}

function shortenCommit(commit: string) {
  return commit.slice(0, 7);
}
