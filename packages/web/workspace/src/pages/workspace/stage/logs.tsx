import { Invocation, LogStore } from "$/data/log";
import { LogPollerStore } from "$/data/log-poller";
import { createSubscription, useReplicache } from "$/providers/replicache";
import { Tag, Text } from "$/ui";
import { IconBoltSolid } from "$/ui/icons";
import { IconCaretRight } from "$/ui/icons/custom";
import { Row, Stack } from "$/ui/layout";
import { theme } from "$/ui/theme";
import { utility } from "$/ui/utility";
import { globalKeyframes, globalStyle } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
} from "solid-js";
import { useFunctionsContext, useResourcesContext } from "./context";
import { Resource } from "@console/core/app/resource";
import { DUMMY_LOGS } from "./logs-dummy";
import { createEventListener } from "@solid-primitives/event-listener";

const LogList = styled("div", {
  base: {
    borderStyle: "solid",
    borderColor: theme.color.divider.base,
    borderWidth: "0 1px 1px",
    borderRadius: theme.borderRadius,
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
    height: 48,
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

const LogText = styled("div", {
  base: {
    ...utility.textLine(),
    fontFamily: theme.font.family.code,
  },
});

const LogDate = styled(LogText, {
  base: {
    flexShrink: 0,
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
  },
});

const LogLink = styled("a", {
  base: {
    visibility: "hidden",
  },
});

const LogEntries = styled("div", {
  base: {
    borderRadius: theme.borderRadius,
    padding: `0 ${theme.space[4]}`,
    fontSize: theme.font.size.mono_sm,
    backgroundColor: theme.color.background.surface,
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

const LogEntryTime = styled("div", {
  base: {
    flexShrink: 0,
    minWidth: 89,
    textAlign: "left",
    color: theme.color.text.dimmed.base,
    lineHeight: theme.font.lineHeight,
  },
});

const LogEntryMessage = styled("span", {
  base: {
    minWidth: 0,
    overflowWrap: "break-word",
    lineHeight: theme.font.lineHeight,
    color: theme.color.text.primary.surface,
  },
});

const LogLoadingIndicator = styled("div", {
  base: {
    ...utility.row(2),
    alignItems: "center",
    padding: `0 ${theme.space[3]}`,
    height: 48,
    borderTop: `1px solid ${theme.color.divider.base}`,
    borderRadius: `${theme.borderRadius} ${theme.borderRadius} 0 0`,
  },
});

const LogLoadingIndicatorIcon = styled("div", {
  base: {
    padding: 2,
    width: 20,
    height: 20,
    color: theme.color.text.dimmed.base,
    opacity: theme.iconOpacity,
    animation: "pulse 1.5s linear infinite",
  },
});

const LogLoadingIndicatorCopy = styled("div", {
  base: {
    color: theme.color.text.dimmed.base,
    fontSize: theme.font.size.base,
  },
});

globalKeyframes("pulse", {
  "0%": {
    opacity: 0.3,
  },
  "50%": {
    opacity: 1,
  },
  "100%": {
    opacity: 0.3,
  },
});
export function Logs() {
  const nav = useNavigate();
  createEventListener(window, "keydown", (e) => {
    console.log(e.key);
    if (e.key === "Escape") {
      nav("../../");
    }
  });
  const params = useParams();
  const [query] = useSearchParams();
  const resources = useResourcesContext();
  const resource = createMemo(
    () =>
      resources().find((x) => x.id === params.resourceID) as
        | Extract<Resource.Info, { type: "Function" }>
        | undefined
  );
  const functions = useFunctionsContext();
  const context = createMemo(() => {
    const parent = functions().get(resource()?.id || "")?.[0];
    if (!parent) return;

    switch (parent.type) {
      case "EventBus":
        return "Subscriber";
      case "Api":
        const route = parent.metadata.routes.find(
          (r) => r.fn?.node === resource()?.addr
        );
        if (route) return route.route;
    }
  });
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
  const rep = useReplicache();
  const poller = createSubscription(() =>
    LogPollerStore.fromLogGroup(logGroup())
  );

  createEffect(() => {
    if (!logGroup()) return;
    if (poller()) return;
    rep().mutate.log_poller_subscribe({
      logGroup: logGroup(),
      stageID: resources()?.at(0)?.stageID!,
    });
  });

  const logs = createMemo((): Invocation[] => {
    console.log("dummy", query.dummy);
    if (query.dummy) return DUMMY_LOGS;
    return LogStore[logGroup()] || [];
  });

  return (
    <Stack space="6">
      <Stack space="3">
        <Text size="xl">{resource()?.metadata.handler}</Text>
        <Show when={context()}>
          <Row>
            <Tag style="outline">{context()}</Tag>
          </Row>
        </Show>
      </Stack>
      <LogList>
        <LogLoadingIndicator>
          <LogLoadingIndicatorIcon>
            <IconBoltSolid />
          </LogLoadingIndicatorIcon>
          <LogLoadingIndicatorCopy>
            Tailing logs&hellip;
          </LogLoadingIndicatorCopy>
        </LogLoadingIndicator>
        <For each={logs()}>
          {(invocation) => {
            const [expanded, setExpanded] = createSignal(false);

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
            const empty = createMemo(() => invocation.logs.length === 0);

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
                      <LogDetailHeaderTitle>Details</LogDetailHeaderTitle>
                      <LogLink href={""} target="_blank" rel="noreferrer">
                        Link
                      </LogLink>
                    </LogDetailHeader>
                    <LogEntries>
                      {invocation.logs.map((entry) => (
                        <LogEntry>
                          <LogEntryTime>
                            {entry.timestamp.toLocaleTimeString()}
                          </LogEntryTime>
                          <LogEntryMessage>{entry.message}</LogEntryMessage>
                        </LogEntry>
                      ))}
                    </LogEntries>
                  </LogDetail>
                </Show>
              </LogContainer>
            );
          }}
        </For>
      </LogList>
    </Stack>
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

function formatTime(milliseconds: number) {
  return milliseconds < 1000
    ? milliseconds.toFixed(0) + "ms"
    : (milliseconds / 1000).toFixed(2) + "s";
}

const shortDateOptions: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  hour12: false,
  minute: "numeric",
  second: "numeric",
  timeZoneName: "short",
};
const longDateOptions: Intl.DateTimeFormatOptions = {
  ...shortDateOptions,
  timeZone: "UTC",
  year: "numeric",
};
