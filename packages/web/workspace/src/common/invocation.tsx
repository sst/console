import { ErrorList, ErrorItem } from "$/pages/workspace/stage/logs/error";
import { Row, TabTitle, Tag, TextButton, theme, utility } from "$/ui";
import { IconBookmark, IconArrowPath } from "$/ui/icons";
import { IconCaretRight } from "$/ui/icons/custom";
import { inputFocusStyles } from "$/ui/form";
import {
  For,
  Match,
  Show,
  Switch,
  batch,
  createMemo,
  createSignal,
  mergeProps,
} from "solid-js";
import { unwrap } from "solid-js/store";
import { formatDuration, formatBytes } from "./format";
import { styled } from "@macaron-css/solid";
import { useReplicache } from "$/providers/replicache";
import { Resource } from "@console/core/app/resource";
import { Invocation } from "@console/core/log";
import { Link } from "@solidjs/router";
import { DateTime } from "luxon";

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

const Root = styled("div", {
  base: {
    borderStyle: "solid",
    borderWidth: "0 1px 1px 1px",
    borderColor: theme.color.divider.base,
    ":last-child": {
      borderRadius: `0 0 ${theme.borderRadius} ${theme.borderRadius}`,
    },
    selectors: {
      "&[data-focus]": {
        ...inputFocusStyles,
      },
    },
  },
  variants: {
    expanded: {
      true: {},
      false: {},
    },
    level: {
      info: {},
      danger: {},
    },
    focus: {
      true: {
        ...inputFocusStyles,
      },
      false: {},
    },
  },
  defaultVariants: {
    expanded: false,
    level: "info",
  },
});

const Summary = styled("div", {
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

const CaretIcon = styled("button", {
  base: {
    width: 20,
    height: 20,
    flexShrink: 0,
    lineHeight: 0,
    color: theme.color.icon.dimmed,
    selectors: {
      [`${Root.selector({ expanded: true })} &`]: {
        transform: "rotate(90deg)",
      },
    },
  },
});

const Detail = styled("div", {
  base: {
    padding: theme.space[3],
    ...utility.stack(3),
    selectors: {
      [`${Root.selector({ expanded: true })} &`]: {
        borderTop: `1px solid ${theme.color.divider.base}`,
      },
    },
  },
});

const DetailHeader = styled("div", {
  base: {
    display: "flex",
    padding: `0 ${theme.space.px}`,
    alignItems: "center",
    justifyContent: "space-between",
  },
});

const Logs = styled("div", {
  base: {
    borderRadius: theme.borderRadius,
    padding: `0 ${theme.space[4]}`,
    backgroundColor: theme.color.background.surface,
  },
  variants: {
    error: {
      true: {
        padding: `0`,
      },
      false: {},
    },
  },
  defaultVariants: {
    error: false,
  },
});

export const Log = styled("div", {
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

export const LogTime = styled("div", {
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

export const LogMessage = styled("span", {
  base: {
    minWidth: 0,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
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

const LogText = styled("div", {
  base: {
    ...utility.text.line,
    lineHeight: "normal",
    fontFamily: theme.font.family.code,
  },
});

const Timestamp = styled(LogText, {
  base: {
    flexShrink: 0,
    minWidth: 190,
    paddingLeft: theme.space[2],
  },
});

const Duration = styled(LogText, {
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

const RequestID = styled(LogText, {
  base: {
    paddingLeft: theme.space[2],
    flexShrink: 0,
    whiteSpace: "pre",
    color: theme.color.text.secondary.base,
    fontSize: theme.font.size.mono_base,
  },
});

const LogPreview = styled(LogText, {
  base: {
    flexGrow: 1,
    alignSelf: "center",
    paddingLeft: theme.space[2],
    fontSize: theme.font.size.mono_base,
    selectors: {
      [`${Root.selector({ level: "danger" })} &`]: {
        color: `hsla(${theme.color.base.red}, 100%)`,
      },
    },
  },
});

const LogReportKey = styled(LogTime, {
  base: {
    minWidth: 105,
  },
});

const FunctionLink = styled(Link, {
  base: {
    cursor: "pointer",
    fontSize: theme.font.size.sm,
  },
});

export function InvocationRow(props: {
  invocation: Invocation;
  onSavePayload?: () => void;
  function: Resource.InfoByType<"Function">;
  local: boolean;
  mixed?: boolean;
  focus?: boolean;
}) {
  const [expanded, setExpanded] = createSignal(false);
  const [tab, setTab] = createSignal<
    "logs" | "request" | "response" | "error" | "report"
  >("logs");

  const shortDate = createMemo(() =>
    new Intl.DateTimeFormat("en-US", shortDateOptions)
      .format(props.invocation.start)
      .replace(" at ", ", ")
  );
  const longDate = createMemo(() =>
    new Intl.DateTimeFormat("en-US", longDateOptions).format(
      props.invocation.start
    )
  );
  const [replaying, setReplaying] = createSignal(false);
  const rep = useReplicache();
  const level = createMemo(() =>
    props.invocation.errors.length
      ? props.invocation.errors.some((error) => error.failed)
        ? "fail"
        : "error"
      : "info"
  );

  return (
    <Root
      data-element="invocation"
      focus={props.focus}
      data-focus={props.focus ? true : undefined}
      data-expanded={expanded() ? true : undefined}
      expanded={expanded()}
      level={level() === "info" ? "info" : "danger"}
    >
      <Summary
        onClick={() => {
          setExpanded((r) => !r);
        }}
      >
        <Row flex={false} space="2" vertical="center">
          <CaretIcon>
            <IconCaretRight />
          </CaretIcon>
          <Level level={level()} />
        </Row>
        <Timestamp title={longDate()}>{shortDate()}</Timestamp>
        <Duration
          coldStart={props.invocation.cold}
          title={props.invocation.cold ? "Cold start" : ""}
        >
          {props.invocation.report?.duration
            ? formatDuration(props.invocation.report?.duration)
            : "-"}
        </Duration>
        <RequestID title="Request Id">
          {props.invocation.id.slice(0, 36)}
        </RequestID>
        <LogPreview>
          {props.mixed
            ? props.function.metadata.handler
            : props.invocation.errors[0]?.message ||
              props.invocation.logs[0]?.message}
        </LogPreview>
      </Summary>
      <Show when={expanded()}>
        <Detail>
          <DetailHeader>
            <Row space="5" vertical="center">
              <TabTitle
                size="mono_sm"
                onClick={() => setTab("logs")}
                state={tab() === "logs" ? "active" : "inactive"}
              >
                Logs
              </TabTitle>
              <Show when={props.invocation.errors.length}>
                <TabTitle
                  size="mono_sm"
                  onClick={() => setTab("error")}
                  state={tab() === "error" ? "active" : "inactive"}
                >
                  Error
                </TabTitle>
              </Show>
              <Show when={props.invocation.input || props.local}>
                <TabTitle
                  size="mono_sm"
                  onClick={() => setTab("request")}
                  state={
                    !props.invocation.input!
                      ? "disabled"
                      : tab() === "request"
                      ? "active"
                      : "inactive"
                  }
                >
                  Request
                </TabTitle>
              </Show>
              <Show when={props.invocation.output || props.local}>
                <TabTitle
                  size="mono_sm"
                  onClick={() => setTab("response")}
                  state={
                    !props.invocation.output
                      ? "disabled"
                      : tab() === "response"
                      ? "active"
                      : "inactive"
                  }
                >
                  Response
                </TabTitle>
              </Show>
              <Show when={props.invocation.report && !props.local}>
                <TabTitle
                  size="mono_sm"
                  onClick={() => setTab("report")}
                  state={tab() === "report" ? "active" : "inactive"}
                >
                  Report
                </TabTitle>
              </Show>
            </Row>
            <Show when={props.invocation.input}>
              <Row space="4" vertical="center">
                <Show when={props.onSavePayload}>
                  <TextButton
                    onClick={() => props.onSavePayload?.()}
                    on="surface"
                    icon={<IconBookmark />}
                  >
                    Save
                  </TextButton>
                </Show>
                <Show when={!props.onSavePayload}>
                  <FunctionLink href={`../resources/logs/${props.function.id}`}>
                    View function
                  </FunctionLink>
                </Show>
                <TextButton
                  on="surface"
                  completing={replaying()}
                  icon={<IconArrowPath />}
                  onClick={() => {
                    setReplaying(true);
                    rep().mutate.function_invoke({
                      stageID: props.function.stageID,
                      functionARN: props.function.metadata.arn,
                      payload: structuredClone(unwrap(props.invocation.input)),
                    });
                    setTimeout(() => setReplaying(false), 2000);
                  }}
                >
                  Replay
                </TextButton>
              </Row>
            </Show>
          </DetailHeader>
          <Logs error={tab() === "error"}>
            <Switch>
              <Match when={tab() === "error"}>
                <ErrorList>
                  <For each={props.invocation.errors}>
                    {(error) => <ErrorItem error={error} />}
                  </For>
                </ErrorList>
              </Match>
              <Match when={tab() === "logs"}>
                <Show when={props.invocation.logs.length === 0}>
                  <Log>
                    <LogMessage dimmed>
                      Nothing was logged in this invocation
                    </LogMessage>
                  </Log>
                </Show>
                <For each={props.invocation.logs}>
                  {(entry) => (
                    <Log>
                      <LogTime
                        title={DateTime.fromMillis(entry.timestamp)
                          .toUTC()
                          .toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS)}
                      >
                        {DateTime.fromMillis(entry.timestamp).toFormat(
                          "HH:mm:ss:uu"
                        )}
                      </LogTime>
                      <LogMessage>{entry.message}</LogMessage>
                    </Log>
                  )}
                </For>
              </Match>
              <Match when={tab() === "request"}>
                <Log>
                  <LogMessage>
                    {JSON.stringify(props.invocation.input, null, 2)}
                  </LogMessage>
                </Log>
              </Match>
              <Match when={tab() === "response"}>
                <Log>
                  <LogMessage>
                    {JSON.stringify(props.invocation.output, null, 2)}
                  </LogMessage>
                </Log>
              </Match>
              <Match when={tab() === "report"}>
                <Log>
                  <LogReportKey>Duration</LogReportKey>
                  <LogMessage>
                    {formatDuration(props.invocation.report?.duration || 0)}
                  </LogMessage>
                </Log>
                <Show when={props.invocation.report?.memory}>
                  <Log>
                    <LogReportKey>Memory used</LogReportKey>
                    <LogMessage>
                      <Show when={props.invocation.report?.memory}>
                        {(size) => {
                          const formattedSize = formatBytes(
                            size() * 1024 * 1024
                          );
                          return `${formattedSize.value}${formattedSize.unit}`;
                        }}
                      </Show>
                    </LogMessage>
                  </Log>
                </Show>
                <Log>
                  <LogReportKey>Memory size</LogReportKey>
                  <LogMessage>
                    <Show when={props.invocation.report?.size}>
                      {(size) => {
                        const formattedSize = formatBytes(size() * 1024 * 1024);
                        return `${formattedSize.value}${formattedSize.unit}`;
                      }}
                    </Show>
                  </LogMessage>
                </Log>
                <Show when={props.invocation.report?.xray}>
                  <Log>
                    <LogReportKey>X-Ray ID</LogReportKey>
                    <LogMessage>{props.invocation.report?.xray}</LogMessage>
                  </Log>
                </Show>
              </Match>
            </Switch>
          </Logs>
        </Detail>
      </Show>
    </Root>
  );
}

function Level(props: { level?: string }) {
  props = mergeProps({ level: "info" }, props);
  return (
    <Tag
      size="small"
      style={props.level === "error" ? "outline" : "solid"}
      level={
        props.level === "fail" || props.level === "error" ? "danger" : "info"
      }
    >
      {props.level}
    </Tag>
  );
}
