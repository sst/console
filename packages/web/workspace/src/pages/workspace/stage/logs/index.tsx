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
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onMount,
} from "solid-js";
import { useResourcesContext, useStageContext } from "../context";
import { Resource } from "@console/core/app/resource";
import { DUMMY_LOGS } from "./logs-dummy";
import { useCommandBar } from "../../command-bar";
import { IconMap } from "../resources";
import { bus } from "$/providers/bus";
import { unwrap } from "solid-js/store";
import { useLocalContext } from "$/providers/local";
import { Invoke, InvokeControl } from "./invoke";
import { createId } from "@paralleldrive/cuid2";
import { LogSearchStore } from "$/data/log-search";

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
    color: theme.color.accent,
    opacity: theme.iconOpacity,
  },
  variants: {
    pulse: {
      true: {},
      false: {},
    },
  },
  defaultVariants: {
    pulse: true,
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
  const local = useLocalContext();
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
        if (r.enrichment.live) return r.addr;
        return r.metadata.arn
          .replace("function:", "log-group:/aws/lambda/")
          .replace("arn:aws:lambda", "arn:aws:logs");
      }
      return "";
    })();

    return logGroup;
  });

  const [view, setView] = createSignal("search");
  const mode = createMemo(() => {
    if (resource()?.enrichment.live) return "live";
    if (view() === "tail") return "tail";
    return "search";
  });

  const logGroupKey = createMemo(() => {
    const base = logGroup();
    if (mode() === "live") return base;
    return base + "-" + mode();
  });

  const invocations = createMemo(() => {
    const result = query.dummy ? DUMMY_LOGS : LogStore[logGroupKey()] || [];
    if (mode() === "tail" || mode() === "live") return result.slice().reverse();
    return result;
  });

  const rep = useReplicache();

  const poller = createSubscription(() =>
    LogPollerStore.fromLogGroup(logGroup())
  );
  const search = createSubscription(() =>
    LogSearchStore.fromLogGroup(logGroup())
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
    if (mode() !== "search") return;
    createSearch();
  });

  function createSearch(start?: number) {
    if (!start) clearLogStore(logGroupKey());
    rep().mutate.log_search({
      stageID: stage.stage.id,
      logGroup: logGroup(),
      id: createId(),
      timeStart: start ? new Date(start).toISOString().split("Z")[0] : null,
    });
  }

  let invokeControl!: InvokeControl;

  return (
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
            <LogLoadingIndicatorIcon pulse={mode() !== "search"}>
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
                  Trying to connect to local `sst dev`
                </Match>
                <Match when={mode() === "live"}>
                  Tailing logs from local `sst dev`
                </Match>
                <Match when={mode() === "search"}>Viewing recent logs</Match>
                <Match when={true}>Tailing logs</Match>
              </Switch>
              &hellip;
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
            <Show when={mode() === "search" && !search()}>
              <IconButton
                title="Reload recent logs"
                onClick={() => {
                  clearLogStore(logGroupKey());
                  createSearch();
                }}
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
                <Dropdown.RadioGroup value={mode()} onChange={setView}>
                  <Dropdown.RadioItem value="tail">Live</Dropdown.RadioItem>
                  <Dropdown.RadioItem value="search">Recent</Dropdown.RadioItem>
                  {/*
                <Dropdown.Seperator />
                <Dropdown.RadioItem value="5min">5min ago</Dropdown.RadioItem>
                <Dropdown.RadioItem value="15min">15min ago</Dropdown.RadioItem>
                <Dropdown.RadioItem value="1">1hr ago</Dropdown.RadioItem>
                <Dropdown.RadioItem value="6">6hrs ago</Dropdown.RadioItem>
                <Dropdown.RadioItem value="12">12hrs ago</Dropdown.RadioItem>
                <Dropdown.RadioItem value="24">1 day ago</Dropdown.RadioItem>
                <Dropdown.Seperator />
                <Dropdown.RadioItem value="custom">
                  Specify a time&hellip;
                </Dropdown.RadioItem>
                */}
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
        <Show when={false && invocations().length === 0}>
          <LogEmpty>
            <IconMagnifyingGlass
              width={28}
              height={28}
              color={theme.color.icon.dimmed}
            />
            <Text center color="dimmed">
              Could not find any logs from {new Date().toLocaleTimeString()}
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
            const empty = createMemo(
              () => mode() !== "live" && invocation.logs.length === 0
            );
            const [replaying, setReplaying] = createSignal(false);

            return (
              <LogContainer
                expanded={expanded()}
                level={invocation.error ? "error" : "info"}
              >
                <LogSummary
                  loading={empty()}
                  onClick={() => setExpanded((r) => !empty() && !r)}
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
                    {invocation.id}
                  </LogRequestId>
                  <LogMessage>
                    <Show when={invocation.logs.length > 0}>
                      {invocation.logs[0].message}
                    </Show>
                  </LogMessage>
                </LogSummary>
                <Show when={expanded()}>
                  <LogDetail>
                    <LogDetailHeader>
                      <Row space="5" vertical="center">
                        <LogDetailHeaderTitle
                          onClick={() => setTab("error")}
                          state={tab() === "error" ? "active" : "inactive"}
                        >
                          Error
                        </LogDetailHeaderTitle>
                        <LogDetailHeaderTitle
                          onClick={() => setTab("logs")}
                          state={
                            mode() === "live"
                              ? tab() === "logs"
                                ? "active"
                                : "inactive"
                              : "inactive"
                          }
                        >
                          Logs
                        </LogDetailHeaderTitle>
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
                              {DUMMY_ERROR_JSON.stack[0]}
                            </Text>
                            <LogErrorMessage>
                              {DUMMY_ERROR_JSON.stack.slice(1).join("\n")}
                            </LogErrorMessage>
                          </LogError>
                        </Match>
                        <Match when={tab() === "logs"}>
                          {invocation.logs.map((entry, i) => {
                            return (
                              <LogEntry>
                                <LogEntryTime>
                                  {entry.timestamp.toLocaleTimeString()}
                                </LogEntryTime>
                                <Show when={i === 4}>
                                  <Stack
                                    style={{ "min-width": "0" }}
                                    space="1.5"
                                  >
                                    <LogEntryMessageErrorTitle>
                                      {DUMMY_ERROR_JSON.stack[0]}
                                    </LogEntryMessageErrorTitle>
                                    <LogEntryMessage error>
                                      {DUMMY_ERROR_JSON.stack
                                        .slice(1)
                                        .join("\n")}
                                    </LogEntryMessage>
                                  </Stack>
                                </Show>
                                <Show when={i !== 4}>
                                  <LogEntryMessage>
                                    {entry.message}
                                  </LogEntryMessage>
                                </Show>
                              </LogEntry>
                            );
                          })}
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
            <Match when={search()}>
              <LogMoreIndicator>
                <LogMoreIndicatorIcon>
                  <IconArrowPathSpin />
                </LogMoreIndicatorIcon>
                <Text leading="normal" color="dimmed" size="sm">
                  Loading from{" "}
                  {new Date(
                    search()?.timeStart ? search()?.timeStart + "Z" : Date.now()
                  ).toLocaleString()}
                  &hellip;
                </Text>
              </LogMoreIndicator>
            </Match>
            <Match when={true}>
              <LogMoreIndicator>
                <Text
                  leading="normal"
                  color="dimmed"
                  size="sm"
                  onClick={() => {
                    const i = invocations();
                    console.log(
                      "scanning from",
                      i[i.length - 1].start.toISOString()
                    );
                    createSearch(i[i.length - 1]!.start.getTime());
                  }}
                >
                  Click to load more
                </Text>
              </LogMoreIndicator>
            </Match>
          </Switch>
        </Show>
      </LogList>
    </Stack>
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
