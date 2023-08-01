import { LogStore, clearLogStore } from "$/data/log";
import { LogPollerStore } from "$/data/log-poller";
import { createSubscription, useReplicache } from "$/providers/replicache";
import { Tag, Text } from "$/ui";
import { Dropdown } from "$/ui/dropdown";
import {
  IconBookmark,
  IconArrowPath,
  IconArrowDown,
  IconBoltSolid,
  IconArrowsUpDown,
  IconChevronUpDown,
  IconMagnifyingGlass,
  IconEllipsisVertical,
  IconArrowPathRoundedSquare,
} from "$/ui/icons";
import { IconCaretRight, IconArrowPathSpin } from "$/ui/icons/custom";
import { Row, Stack } from "$/ui/layout";
import { TextButton, IconButton } from "$/ui/button";
import { theme } from "$/ui/theme";
import { utility } from "$/ui/utility";
import { globalKeyframes, style } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { useParams, useSearchParams } from "@solidjs/router";
import {
  For,
  Match,
  Show,
  Switch,
  batch,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onMount,
  untrack,
} from "solid-js";
import { useResourcesContext, useStageContext } from "../context";
import { Resource } from "@console/core/app/resource";
import { DUMMY_LOGS } from "./logs-dummy";
import { useCommandBar } from "../../command-bar";
import { IconMap } from "../resources";
import { bus } from "$/providers/bus";
import { createStore, produce, unwrap } from "solid-js/store";
import { useLocalContext } from "$/providers/local";
import { Invoke, InvokeControl } from "./invoke";
import { createId } from "@paralleldrive/cuid2";
import { LogSearchStore } from "$/data/log-search";
import { DialogRange, DialogRangeControl } from "./dialog-range";

const LogSwitchIcon = styled("div", {
  base: {
    top: -1,
    width: 18,
    height: 18,
    position: "relative",
    color: theme.color.icon.secondary,
  },
});

const LogList = styled("div", {
  base: {
    border: `1px solid ${theme.color.divider.base}`,
    borderRadius: theme.borderRadius,
  },
});

const LogLoadingIndicator = styled("div", {
  base: {
    ...utility.row(0),
    height: 52,
    alignItems: "center",
    justifyContent: "space-between",
    padding: `0 ${theme.space[3]}`,
  },
});

const LogLoadingIndicatorIcon = styled("div", {
  base: {
    padding: 2,
    width: 20,
    height: 20,
    opacity: theme.iconOpacity,
  },
  variants: {
    pulse: {
      true: {},
      false: {},
    },
    glow: {
      true: {
        color: theme.color.accent,
      },
      false: {
        color: theme.color.icon.dimmed,
      },
    },
  },
  defaultVariants: {
    pulse: true,
    glow: false,
  },
});

const LogLoadingIndicatorIconSvg = style({
  selectors: {
    [`${LogLoadingIndicatorIcon.selector({ pulse: true })} &`]: {
      animation: "glow-pulse 1.7s linear infinite alternate",
    },
  },
});

globalKeyframes("glow-pulse", {
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

const LogContainer = styled("div", {
  base: {
    borderTop: `1px solid ${theme.color.divider.base}`,
  },
  variants: {
    expanded: {
      true: {},
      false: {},
    },
    level: {
      info: {},
      error: {},
    },
  },
  defaultVariants: {
    expanded: false,
    level: "info",
  },
});

const LogSummary = styled("div", {
  base: {
    ...utility.row(3),
    height: 51,
    fontSize: theme.font.size.mono_sm,
    alignItems: "center",
    padding: `0 ${theme.space[3]}`,
    transition: `opacity ${theme.colorFadeDuration} ease-out`,
  },
  variants: {
    loading: {
      true: {
        opacity: 0.4,
      },
      false: {
        opacity: 1,
      },
    },
  },
});

const LogEmpty = styled("div", {
  base: {
    ...utility.stack(4),
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    borderTop: `1px solid ${theme.color.divider.base}`,
  },
});

const LogText = styled("div", {
  base: {
    ...utility.textLine(),
    fontFamily: theme.font.family.code,
  },
});

const LogDate = styled(LogText, {
  base: {
    flexShrink: 0,
    minWidth: 190,
    paddingLeft: theme.space[2],
  },
});

const LogDuration = styled(LogText, {
  base: {
    flexShrink: 0,
    minWidth: 70,
    textAlign: "right",
    color: theme.color.text.secondary.base,
  },
  variants: {
    coldStart: {
      true: {
        color: `hsla(${theme.color.base.blue}, 100%)`,
      },
      false: {},
    },
  },
  defaultVariants: {
    coldStart: false,
  },
});

const LogRequestId = styled(LogText, {
  base: {
    paddingLeft: theme.space[2],
    flexShrink: 0,
    whiteSpace: "pre",
    lineHeight: "normal",
    color: theme.color.text.secondary.base,
    fontSize: theme.font.size.mono_base,
  },
});

const LogMessage = styled(LogText, {
  base: {
    flexGrow: 1,
    alignSelf: "center",
    lineHeight: "normal",
    paddingLeft: theme.space[2],
    fontSize: theme.font.size.mono_base,
    selectors: {
      [`${LogContainer.selector({ level: "error" })} &`]: {
        color: `hsla(${theme.color.base.red}, 100%)`,
      },
    },
  },
});

const CaretIcon = styled("div", {
  base: {
    width: 20,
    height: 20,
    flexShrink: 0,
    lineHeight: 0,
    color: theme.color.icon.dimmed,
    transition: "transform 0.2s ease-out",
    selectors: {
      [`${LogContainer.selector({ expanded: true })} &`]: {
        transform: "rotate(90deg)",
      },
    },
  },
});

const LogDetail = styled("div", {
  base: {
    padding: theme.space[3],
    ...utility.stack(3),
    selectors: {
      [`${LogContainer.selector({ expanded: true })} &`]: {
        borderTop: `1px solid ${theme.color.divider.base}`,
      },
    },
  },
});

const LogDetailHeader = styled("div", {
  base: {
    display: "flex",
    fontSize: theme.font.size.sm,
    padding: `0 ${theme.space.px}`,
    alignItems: "center",
    justifyContent: "space-between",
  },
});

const LogDetailHeaderTitle = styled("div", {
  base: {
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontFamily: theme.font.family.heading,
    color: theme.color.text.dimmed.base,
    fontWeight: 500,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    ":hover": {
      color: theme.color.text.secondary.base,
    },
  },
  variants: {
    state: {
      active: {
        color: theme.color.text.primary.base,
        ":hover": {
          color: theme.color.text.primary.base,
        },
      },
      inactive: {},
      disabled: {
        opacity: "0.65",
        ":hover": {
          color: theme.color.text.dimmed.base,
        },
      },
    },
  },
  defaultVariants: {
    state: "inactive",
  },
});

const LogEntries = styled("div", {
  base: {
    borderRadius: theme.borderRadius,
    padding: `0 ${theme.space[4]}`,
    backgroundColor: theme.color.background.surface,
  },
  variants: {
    error: {
      true: {
        padding: `0 ${theme.space[5]}`,
        backgroundColor: theme.color.background.red,
      },
      false: {},
    },
  },
  defaultVariants: {
    error: false,
  },
});

const LogEntry = styled("div", {
  base: {
    ...utility.row(3.5),
    borderTop: `1px solid ${theme.color.divider.surface}`,
    paddingTop: theme.space[3],
    paddingBottom: theme.space[3],
    fontFamily: theme.font.family.code,
    selectors: {
      "&:first-child": {
        borderTop: "none",
      },
    },
  },
});

const LogError = styled("div", {
  base: {
    ...utility.stack(2),
    paddingTop: theme.space[4],
    paddingBottom: theme.space[4],
  },
});

const LogEntryTime = styled("div", {
  base: {
    flexShrink: 0,
    minWidth: 89,
    textAlign: "left",
    color: theme.color.text.dimmed.base,
    fontSize: theme.font.size.mono_sm,
    lineHeight: theme.font.lineHeight,
    fontFamily: theme.font.family.code,
  },
});

const LogEntryMessage = styled("span", {
  base: {
    minWidth: 0,
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    lineHeight: theme.font.lineHeight,
    color: theme.color.text.primary.surface,
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_sm,
  },
  variants: {
    error: {
      true: {
        color: `hsla(${theme.color.base.red}, 100%)`,
      },
      false: {},
    },
    dimmed: {
      true: {
        color: theme.color.text.dimmed.surface,
      },
      false: {},
    },
  },
  defaultVariants: {
    error: false,
    dimmed: false,
  },
});

const LogEntryMessageErrorTitle = styled("span", {
  base: {
    color: `hsla(${theme.color.base.red}, 100%)`,
    fontSize: theme.font.size.mono_sm,
    fontWeight: 500,
    fontFamily: theme.font.family.code,
    lineHeight: "normal",
  },
});

const LogErrorMessage = styled("span", {
  base: {
    lineHeight: 2,
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    fontFamily: theme.font.family.code,
    color: theme.color.text.primary.surface,
    fontSize: theme.font.size.mono_sm,
  },
});

const LogMoreIndicator = styled("div", {
  base: {
    ...utility.row(2),
    alignItems: "center",
    padding: `${theme.space[3]} ${theme.space[3]}`,
    borderTop: `1px solid ${theme.color.divider.base}`,
  },
});

const LogMoreIndicatorIcon = styled("div", {
  base: {
    padding: 2,
    width: 20,
    height: 20,
    color: theme.color.text.dimmed.base,
    opacity: theme.iconOpacity,
  },
});

const DUMMY_ERROR_JSON = {
  errorType: "TypeError",
  errorMessage: "Cannot read properties of undefined (reading 'charAt')",
  stack: [
    "TypeError: Cannot read properties of undefined (reading 'charAt')",
    "    at capitalize (file:///var/task/packages/functions/src/typeform/intake.mjs:33499:16)",
    "    at file:///var/task/packages/functions/src/typeform/intake.mjs:33444:14",
    "    at processTicksAndRejections (node:internal/process/task_queues:96:5)",
    "    at async file:///var/task/packages/functions/src/typeform/intake.mjs:32376:20",
  ],
};

export function Logs() {
  const stage = useStageContext();
  const bar = useCommandBar();
  const params = useParams();
  const [query] = useSearchParams();
  const resources = useResourcesContext();
  const resource = createMemo(
    () =>
      resources().find((x) => x.id === params.resourceID) as
        | Extract<Resource.Info, { type: "Function" }>
        | undefined
  );

  const logGroup = createMemo(() => {
    if (params.resourceID.includes("arn")) {
      return params.resourceID
        .replace("function:", "log-group:/aws/lambda/")
        .replace("arn:aws:lambda", "arn:aws:logs");
    }

    const r = resource();
    if (!r) return "";
    const logGroup = (() => {
      if (r.type === "Function") {
        return r.metadata.arn
          .replace("function:", "log-group:/aws/lambda/")
          .replace("arn:aws:lambda", "arn:aws:logs");
      }
      return "";
    })();

    return logGroup;
  });

  const [view, setView] = createSignal<string>();
  const mode = createMemo(() => {
    if (resource()?.enrichment.live) return "live";
    if (view() === "tail") return "tail";
    return "search";
  });

  const rep = useReplicache();

  const poller = createSubscription(() =>
    LogPollerStore.fromLogGroup(logGroup())
  );

  createEffect(() => {
    if (!logGroup()) return;
    if (poller()) return;
    if (mode() !== "tail") return;
    rep().mutate.log_poller_subscribe({
      logGroup: logGroup(),
      stageID: resources()?.at(0)?.stageID!,
    });
  });

  createEffect(() => {
    const r = resource();
    if (!r) return;
    untrack(() => {
      switchView("recent");
    });
  });

  const [search, setSearch] = createStore<{
    id: string;
    start?: Date;
    end?: Date;
  }>({
    id: createId(),
  });
  const activeSearch = createSubscription(() =>
    LogSearchStore.fromID(search.id || "")
  );

  function createSearch(start?: number, end?: number) {
    setSearch(
      produce((draft) => {
        draft.start = start ? new Date(start) : undefined;
        draft.end = end ? new Date(end) : undefined;
      })
    );

    rep().mutate.log_search({
      id: search.id!,
      stageID: stage.stage.id,
      logGroup: logGroup(),
      timeStart: search.start?.toISOString().split("Z")[0] || null,
      timeEnd: search.end?.toISOString().split("Z")[0] || null,
    });
  }

  const logGroupKey = createMemo(() => {
    const base = logGroup();
    const searchID = search.id!;
    const addr = resource()?.addr!;
    if (mode() === "live") return addr;
    if (mode() === "search") return searchID;
    return base + "-tail";
  });

  const invocations = createMemo(() => {
    const result = query.dummy ? DUMMY_LOGS : LogStore[logGroupKey()] || [];
    if (mode() === "tail" || mode() === "live") return result.slice().reverse();
    return result;
  });

  let invokeControl!: InvokeControl;
  let rangeControl!: DialogRangeControl;

  function switchView(val: string) {
    if (val === "custom") {
      console.log("showing range");
      setTimeout(() => rangeControl.show(), 0);
      return;
    }
    setView(val);
    if (val === "tail") return;
    clearLogStore(logGroupKey());
    setSearch("id", createId());
    if (val === "recent") {
      createSearch();
      return;
    }
    if (val === "5min") {
      createSearch(Date.now() - 1000 * 60 * 5, Date.now());
      return;
    }
    if (val === "15min") {
      createSearch(Date.now() - 1000 * 60 * 15, Date.now());
      return;
    }
    if (val === "1hr") {
      createSearch(Date.now() - 1000 * 60 * 60, Date.now());
      return;
    }
    if (val === "6hr") {
      const start = Date.now() - 1000 * 60 * 60 * 6;
      createSearch(start, start + 1000 * 60 * 60);
      return;
    }
    if (val === "12hr") {
      const start = Date.now() - 1000 * 60 * 60 * 12;
      createSearch(start, start + 1000 * 60 * 60);
      return;
    }
    if (val === "24hr") {
      const start = Date.now() - 1000 * 60 * 60 * 24;
      createSearch(start, start + 1000 * 60 * 60);
      return;
    }
  }

  return (
    <>
      <Stack space="5">
        <Row space="2" horizontal="between" vertical="center">
          <Stack space="2" vertical="center">
            <Text size="lg" weight="medium">
              Logs
            </Text>
            <Row
              space="1"
              horizontal="center"
              onClick={() => bar.show("resource")}
            >
              <Text code size="mono_base" color="secondary">
                {resource()?.metadata.handler}
              </Text>
              <LogSwitchIcon>
                <IconChevronUpDown />
              </LogSwitchIcon>
            </Row>
          </Stack>
          <Show when={mode() === "live"}>
            <Tag level="tip" style="outline">
              Local
            </Tag>
          </Show>
        </Row>
        <LogList>
          <LogLoadingIndicator>
            <Row space="2" vertical="center">
              <LogLoadingIndicatorIcon
                glow={mode() === "live" || mode() === "tail"}
                pulse={mode() !== "search"}
              >
                <Switch>
                  <Match when={mode() === "live" && !stage.connected}>
                    <IconArrowsUpDown />
                  </Match>
                  <Match when={mode() === "search"}>
                    <IconArrowDown />
                  </Match>
                  <Match when={true}>
                    <IconBoltSolid class={LogLoadingIndicatorIconSvg} />
                  </Match>
                </Switch>
              </LogLoadingIndicatorIcon>
              <Text leading="normal" color="dimmed" size="sm">
                <Switch>
                  <Match when={mode() === "live" && !stage.connected}>
                    Trying to connect to local `sst dev`&hellip;
                  </Match>
                  <Match when={mode() === "live"}>
                    Tailing logs from local `sst dev`&hellip;
                  </Match>
                  <Match when={mode() === "search"}>
                    <Show
                      when={search.start && search.end}
                      fallback="Viewing recent logs"
                    >
                      <span>
                        Viewing logs between {search.start?.toLocaleString()} —{" "}
                        {search.end?.toLocaleString()}
                      </span>
                    </Show>
                  </Match>
                  <Match when={true}>Tailing logs&hellip;</Match>
                </Switch>
              </Text>
            </Row>
            <Row space="3" vertical="center">
              <Show when={mode() !== "search" && invocations().length > 0}>
                <TextButton
                  onClick={() => {
                    clearLogStore(logGroupKey());
                    bus.emit("log.cleared", {
                      functionID: logGroup(),
                    });
                  }}
                >
                  Clear
                </TextButton>
              </Show>
              <Show when={mode() === "search" && !activeSearch()}>
                <IconButton
                  title="Reload logs"
                  onClick={() => switchView(view()!)}
                >
                  <IconArrowPathRoundedSquare
                    display="block"
                    width={20}
                    height={20}
                  />
                </IconButton>
              </Show>
              <Show when={mode() !== "live"}>
                <Dropdown size="sm" label="View">
                  <Dropdown.RadioGroup value={view()} onChange={switchView}>
                    <Dropdown.RadioItem closeOnSelect value="tail">
                      Live
                    </Dropdown.RadioItem>
                    <Dropdown.RadioItem closeOnSelect value="recent">
                      Recent
                    </Dropdown.RadioItem>
                    <Dropdown.Seperator />
                    <Dropdown.RadioItem closeOnSelect value="5min">
                      5min ago
                    </Dropdown.RadioItem>
                    <Dropdown.RadioItem closeOnSelect value="15min">
                      15min ago
                    </Dropdown.RadioItem>
                    <Dropdown.RadioItem closeOnSelect value="1hr">
                      1hr ago
                    </Dropdown.RadioItem>
                    <Dropdown.RadioItem closeOnSelect value="6hr">
                      6hrs ago
                    </Dropdown.RadioItem>
                    <Dropdown.RadioItem closeOnSelect value="12hr">
                      12hrs ago
                    </Dropdown.RadioItem>
                    <Dropdown.RadioItem closeOnSelect value="24hr">
                      1 day ago
                    </Dropdown.RadioItem>
                    <Dropdown.Seperator />
                    <Dropdown.RadioItem closeOnSelect value="custom">
                      Specify a time&hellip;
                    </Dropdown.RadioItem>
                  </Dropdown.RadioGroup>
                </Dropdown>
              </Show>
            </Row>
          </LogLoadingIndicator>
          <Show when={mode() !== "search" && resource()}>
            {(resource) => (
              <Invoke
                control={(c) => (invokeControl = c)}
                resource={resource()}
              />
            )}
          </Show>
          <Show
            when={
              !activeSearch() &&
              mode() === "search" &&
              invocations().length === 0
            }
          >
            <LogEmpty>
              <IconMagnifyingGlass
                width={28}
                height={28}
                color={theme.color.icon.dimmed}
              />
              <Text center color="dimmed">
                Could not find any logs
              </Text>
            </LogEmpty>
          </Show>
          <For each={invocations()}>
            {(invocation) => {
              const [expanded, setExpanded] = createSignal(false);
              const [tab, setTab] = createSignal<
                "logs" | "request" | "response" | "error"
              >("logs");

              const shortDate = createMemo(() =>
                new Intl.DateTimeFormat("en-US", shortDateOptions)
                  .format(invocation.start)
                  .replace(" at ", ", ")
              );
              const longDate = createMemo(() =>
                new Intl.DateTimeFormat("en-US", longDateOptions).format(
                  invocation.start
                )
              );
              //              const empty = createMemo(
              //                () => mode() !== "live" && invocation.logs.length === 0
              //              );
              const [replaying, setReplaying] = createSignal(false);

              return (
                <LogContainer
                  expanded={expanded()}
                  level={invocation.error ? "error" : "info"}
                >
                  <LogSummary
                    onClick={() => {
                      batch(() => {
                        if (!expanded() && invocation.error) setTab("error");
                        setExpanded((r) => !r);
                      });
                    }}
                  >
                    <Row shrink={false} space="2" vertical="center">
                      <CaretIcon>
                        <IconCaretRight />
                      </CaretIcon>
                      <LogLevel level={invocation.error ? "error" : "info"} />
                    </Row>
                    <LogDate title={longDate()}>{shortDate()}</LogDate>
                    <LogDuration
                      coldStart={invocation.cold}
                      title={invocation.cold ? "Cold start" : ""}
                    >
                      {invocation.duration
                        ? formatTime(invocation.duration)
                        : "-"}
                    </LogDuration>
                    <LogRequestId title="Request Id">
                      {invocation.id.slice(0, 36)}
                    </LogRequestId>
                    <LogMessage>
                      {invocation.error?.message || invocation.logs[0]?.message}
                    </LogMessage>
                  </LogSummary>
                  <Show when={expanded()}>
                    <LogDetail>
                      <LogDetailHeader>
                        <Row space="5" vertical="center">
                          <LogDetailHeaderTitle
                            onClick={() => setTab("logs")}
                            state={tab() === "logs" ? "active" : "inactive"}
                          >
                            Logs
                          </LogDetailHeaderTitle>
                          <Show when={invocation.error}>
                            <LogDetailHeaderTitle
                              onClick={() => setTab("error")}
                              state={tab() === "error" ? "active" : "inactive"}
                            >
                              Error
                            </LogDetailHeaderTitle>
                          </Show>
                          <Show when={mode() === "live"}>
                            <LogDetailHeaderTitle
                              onClick={() => setTab("request")}
                              state={
                                !invocation.event
                                  ? "disabled"
                                  : tab() === "request"
                                  ? "active"
                                  : "inactive"
                              }
                            >
                              Request
                            </LogDetailHeaderTitle>
                            <LogDetailHeaderTitle
                              onClick={() => setTab("response")}
                              state={
                                !invocation.response
                                  ? "disabled"
                                  : tab() === "response"
                                  ? "active"
                                  : "inactive"
                              }
                            >
                              Response
                            </LogDetailHeaderTitle>
                          </Show>
                        </Row>
                        <Show when={invocation.event}>
                          <Row space="4">
                            <TextButton
                              on="surface"
                              icon={<IconBookmark />}
                              onClick={() =>
                                invokeControl.savePayload(
                                  structuredClone(unwrap(invocation.event))
                                )
                              }
                            >
                              Save
                            </TextButton>
                            <TextButton
                              on="surface"
                              completing={replaying()}
                              icon={<IconArrowPath />}
                              onClick={() => {
                                setReplaying(true);
                                rep().mutate.function_invoke({
                                  stageID: resource()!.stageID,
                                  payload: structuredClone(
                                    unwrap(invocation.event)
                                  ),
                                  functionARN: resource()!.metadata.arn,
                                });
                                setTimeout(() => setReplaying(false), 2000);
                              }}
                            >
                              Replay
                            </TextButton>
                          </Row>
                        </Show>
                      </LogDetailHeader>
                      <LogEntries error={tab() === "error"}>
                        <Switch>
                          <Match when={tab() === "error"}>
                            <LogError>
                              <Text
                                code
                                on="surface"
                                size="mono_base"
                                weight="medium"
                                leading="normal"
                              >
                                {invocation.error?.trace[0]}
                              </Text>
                              <LogErrorMessage>
                                {invocation.error?.trace.slice(1).join("\n")}
                              </LogErrorMessage>
                            </LogError>
                          </Match>
                          <Match when={tab() === "logs"}>
                            <Show when={invocation.logs.length === 0}>
                              <LogEntry>
                                <LogEntryMessage dimmed>
                                  Nothing was logged in this invocation
                                </LogEntryMessage>
                              </LogEntry>
                            </Show>
                            {invocation.logs.map((entry, i) => {
                              return (
                                <LogEntry>
                                  <LogEntryTime>
                                    {entry.timestamp.toLocaleTimeString()}
                                  </LogEntryTime>
                                  <LogEntryMessage>
                                    {entry.message}
                                  </LogEntryMessage>
                                </LogEntry>
                              );
                            })}
                            <Show when={invocation.error}>
                              <LogEntry>
                                <LogEntryTime>
                                  {invocation.end?.toLocaleTimeString()}
                                </LogEntryTime>
                                <Stack style={{ "min-width": "0" }} space="1.5">
                                  <LogEntryMessageErrorTitle>
                                    {invocation.error!.type}
                                  </LogEntryMessageErrorTitle>
                                  <LogEntryMessage error>
                                    {invocation.error?.trace
                                      ?.slice(1)
                                      ?.join("\n")}
                                  </LogEntryMessage>
                                </Stack>
                              </LogEntry>
                            </Show>
                          </Match>
                          <Match when={tab() === "request"}>
                            <LogEntry>
                              <LogEntryMessage>
                                {JSON.stringify(invocation.event, null, 2)}
                              </LogEntryMessage>
                            </LogEntry>
                          </Match>
                          <Match when={tab() === "response"}>
                            <LogEntry>
                              <LogEntryMessage>
                                {JSON.stringify(
                                  invocation.response || invocation.error,
                                  null,
                                  2
                                )}
                              </LogEntryMessage>
                            </LogEntry>
                          </Match>
                        </Switch>
                      </LogEntries>
                    </LogDetail>
                  </Show>
                </LogContainer>
              );
            }}
          </For>
          <Show when={mode() === "search"}>
            <Switch>
              <Match when={activeSearch()}>
                <LogMoreIndicator>
                  <LogMoreIndicatorIcon>
                    <IconArrowPathSpin />
                  </LogMoreIndicatorIcon>
                  <Text leading="normal" color="dimmed" size="sm">
                    <Show
                      when={view() === "recent"}
                      fallback={<>Loading&hellip;</>}
                    >
                      Scanning from{" "}
                      {new Date(
                        activeSearch()?.timeStart
                          ? activeSearch()?.timeStart + "Z"
                          : Date.now()
                      ).toLocaleString()}
                      &hellip;
                    </Show>
                  </Text>
                </LogMoreIndicator>
              </Match>
              <Match when={view() === "recent"}>
                <LogMoreIndicator>
                  <LogMoreIndicatorIcon>
                    <IconEllipsisVertical />
                  </LogMoreIndicatorIcon>
                  <TextButton
                    style={{ "line-height": "normal" }}
                    onClick={() => {
                      const i = invocations();
                      console.log(
                        "scanning from",
                        i[i.length - 1].start.toISOString()
                      );
                      createSearch(i[i.length - 1]!.start.getTime());
                    }}
                  >
                    Load more logs
                  </TextButton>
                </LogMoreIndicator>
              </Match>
              <Match when={false}>
                <LogMoreIndicator>
                  <Text leading="normal" color="dimmed" size="sm">
                    Done
                  </Text>
                </LogMoreIndicator>
              </Match>
            </Switch>
          </Show>
        </LogList>
      </Stack>
      <DialogRange
        onSelect={(start, end) => {
          setView(start.toString());
          clearLogStore(logGroupKey());
          createSearch(start.getTime(), end.getTime());
        }}
        control={(control) => (rangeControl = control)}
      />
    </>
  );
}

function Context(props: {
  tag?: string;
  type?: Resource.Info["type"];
  extra?: string;
}) {
  const icon = createMemo(() => props.type && IconMap[props.type]);
  return (
    <Row vertical="center" space="3">
      <Show when={props.tag}>
        <Tag style="outline">{props.tag}</Tag>
      </Show>
      <Row vertical="center" space="2">
        <Show when={icon()}>
          {icon()!({
            width: 13,
            height: 13,
          })}
          <Text size="sm" color="secondary" on="base">
            {props.type}
          </Text>
        </Show>
      </Row>
      <Show when={props.extra}>
        <Text size="sm" color="secondary" on="base">
          {props.extra!}
        </Text>
      </Show>
    </Row>
  );
}

function LogLevel(props: { level?: string }) {
  props = mergeProps({ level: "info" }, props);
  return (
    <Tag
      size="small"
      style="solid"
      level={props.level === "error" ? "danger" : "info"}
    >
      {props.level}
    </Tag>
  );
}

function formatTime(ms: number): string {
  const milliseconds = ms % 1000;
  const seconds = Math.floor(ms / 1000) % 60;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60));

  if (ms < 1000) {
    return milliseconds + "ms";
  } else if (ms < 1000 * 60) {
    return (seconds + milliseconds / 1000).toFixed(2) + "s";
  } else if (ms < 1000 * 60 * 60) {
    return totalSeconds + "s";
  } else {
    return hours + ":" + (minutes < 10 ? "0" : "") + minutes + "h";
  }
}

const shortDateOptions: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  hour12: true,
  minute: "numeric",
  second: "numeric",
  timeZoneName: "short",
};
const longDateOptions: Intl.DateTimeFormatOptions = {
  ...shortDateOptions,
  timeZone: "UTC",
  year: "numeric",
};

/*
function context() {
  const functions = useFunctionsContext();
  const context = createMemo(() => {
    const parent = functions().get(resource()?.id || "")?.[0];
    if (!parent) return;

    switch (parent.type) {
      case "EventBus":
        return <Context type="EventBus" tag="Subscription" />;
      case "Api": {
        const route = parent.metadata.routes.find(
          (r) => r.fn?.node === resource()?.addr
        );
        if (route) {
          const [method, path] = route.route.split(" ");
          return <Context type="Api" tag={method} extra={path} />;
        }
        break;
      }
      case "ApiGatewayV1Api": {
        const route = parent.metadata.routes.find(
          (r) => r.fn?.node === resource()?.addr
        );
        if (route) {
          const [method, path] = route.route.split(" ");
          return <Context type="Api" tag={method} extra={path} />;
        }
        break;
      }
      case "WebSocketApi": {
        const route = parent.metadata.routes.find(
          (r) => r.fn?.node === resource()?.addr
        );
        if (route) {
          const [method, path] = route.route.split(" ");
          return <Context type="Api" tag={method} extra={path} />;
        }
        break;
      }
      case "Topic": {
        return <Context type="Topic" tag="Subscriber" />;
      }
      case "Bucket": {
        return <Context type="Bucket" tag="Notification" />;
      }
      case "KinesisStream": {
        return <Context type="KinesisStream" tag="Consumer" />;
      }
      case "AppSync": {
        return <Context type="AppSync" tag="Source" />;
      }
      case "Table": {
        return <Context type="Table" tag="Consumer" />;
      }
      case "Cognito": {
        return <Context type="Cognito" tag="Trigger" />;
      }
      case "Cron": {
        return <Context type="Cron" tag="Job" />;
      }
      case "Queue": {
        return <Context type="Queue" tag="Consumer" />;
      }
      case "NextjsSite": {
        return <Context type="NextjsSite" tag="Server" />;
      }
      case "SvelteKitSite": {
        return <Context type="SvelteKitSite" tag="Server" />;
      }
      case "RemixSite": {
        return <Context type="RemixSite" tag="Server" />;
      }
      case "AstroSite": {
        return <Context type="AstroSite" tag="Server" />;
      }
      case "SolidStartSite": {
        return <Context type="SolidStartSite" tag="Server" />;
      }
    }
  });
}
*/
