import { LogStore } from "$/data/log";
import { LogPollerStore } from "$/data/log-poller";
import { ResourceStore } from "$/data/resource";
import { createSubscription, useReplicache } from "$/providers/replicache";
import { Tag } from "$/ui";
import { IconBoltSolid } from "$/ui/icons";
import { IconCaretRight } from "$/ui/icons/custom";
import { Row, Stack } from "$/ui/layout";
import { theme } from "$/ui/theme";
import { utility } from "$/ui/utility";
import { globalKeyframes, globalStyle } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { useParams } from "@solidjs/router";
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
} from "solid-js";

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
    ...utility.row(1.5),
    alignItems: "center",
    borderStyle: "solid",
    borderColor: theme.color.divider.base,
    borderWidth: 0,
    padding: `${theme.space[2.5]} ${theme.space[1.5]}`,
    selectors: {
      [`${LogContainer.selector({ expanded: true })} &`]: {
        borderBottomWidth: 1,
      },
    },
  },
});

globalStyle(`${LogSummary} *`, {
  cursor: "pointer",
});

const LogText = styled("div", {
  base: {
    ...utility.textLine(),
    fontFamily: theme.fonts.code,
    fontSize: "0.75rem",
  },
});

const LogDate = styled(LogText, {
  base: {
    flexShrink: 0,
    fontSize: "0.75rem",
    paddingLeft: theme.space[2],
  },
});

const LogDuration = styled(LogText, {
  base: {
    flexShrink: 0,
    minWidth: 70,
    textAlign: "right",
    fontSize: "0.75rem",
    color: theme.color.text.secondary,
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
    fontSize: "0.75rem",
    color: theme.color.text.secondary,
  },
});

const LogMessage = styled(LogText, {
  base: {
    flexGrow: 1,
    lineHeight: "normal",
    fontSize: "0.75rem",
    paddingLeft: theme.space[2],
    selectors: {
      [`${LogContainer.selector({ level: "error" })} &`]: {
        color: `hsla(${theme.color.base.red}, 100%)`,
      },
    },
  },
});

const CaretIcon = styled("div", {
  base: {
    width: 15,
    height: 15,
    flexShrink: 0,
    lineHeight: 0,
    color: theme.color.text.dimmed,
    opacity: theme.iconOpacity,
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
    padding: theme.space[2.5],
  },
});

const LogDetailHeader = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: theme.space[2.5],
  },
});

const LogDetailHeaderTitle = styled("h6", {
  base: {
    paddingLeft: 1,
    fontSize: "0.75rem",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontFamily: theme.fonts.heading,
    color: theme.color.text.dimmed,
    fontWeight: 500,
  },
});

const LogLink = styled("a", {
  base: {
    fontSize: "0.75rem",
    paddingRight: 1,
  },
});

const LogEntries = styled("div", {
  base: {
    borderRadius: theme.borderRadius,
    paddingLeft: theme.space[3],
    paddingRight: theme.space[3],
    backgroundColor: theme.color.background.surface,
  },
});

const LogEntry = styled("div", {
  base: {
    borderTop: `1px solid ${theme.color.divider.surface}`,
    paddingTop: theme.space[2.5],
    paddingBottom: theme.space[2.5],
    fontFamily: theme.fonts.code,
    fontSize: "0.75rem",
    lineHeight: 1.6,
    color: theme.color.text.primary.surface,
    selectors: {
      "&:first-child": {
        borderTop: "none",
      },
    },
  },
});

const LogLoadingIndicator = styled("div", {
  base: {
    ...utility.row(1.5),
    alignItems: "center",
    padding: `${theme.space[2.5]} ${theme.space[1.5]}`,
    borderTop: `1px solid ${theme.color.divider.base}`,
    borderRadius: `0 0 ${theme.borderRadius} ${theme.borderRadius}`,
  },
});

const LogLoadingIndicatorIcon = styled("div", {
  base: {
    width: 15,
    height: 15,
    color: theme.color.text.dimmed,
    opacity: theme.iconOpacity,
    animation: "pulse 1.5s linear infinite",
  },
});

const LogLoadingIndicatorCopy = styled("div", {
  base: {
    color: theme.color.text.dimmed,
    fontSize: "0.8125rem",
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
  const params = useParams();
  const resource = createSubscription(() =>
    ResourceStore.fromID(params.resourceID)
  );
  const logGroup = createMemo(() => {
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
    if (!resource()) return;
    rep().mutate.log_poller_subscribe({
      logGroup: logGroup(),
      stageID: resource()!.stageID,
    });
  });

  return (
    <>
      <div>Logs for {resource()?.cfnID}</div>
      <LogList>
        <For each={LogStore[logGroup()] || []}>
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

            return (
              <LogContainer
                expanded={expanded()}
                level={invocation.error ? "error" : "info"}
              >
                <LogSummary onClick={() => setExpanded((r) => !r)}>
                  <CaretIcon>
                    <IconCaretRight />
                  </CaretIcon>
                  <LogLevel level={invocation.error ? "error" : "info"} />
                  <LogDate title={longDate()}>{shortDate()}</LogDate>
                  <LogDuration
                    coldStart={invocation.cold}
                    title={invocation.cold ? "Cold start" : ""}
                  >
                    {formatTime(invocation.duration || 0)}
                  </LogDuration>
                  <LogRequestId title="Request Id">
                    {invocation.id}
                  </LogRequestId>
                  <LogMessage></LogMessage>
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
                          {invocation.start.toLocaleTimeString()}{" "}
                          {entry.message}
                        </LogEntry>
                      ))}
                    </LogEntries>
                  </LogDetail>
                </Show>
              </LogContainer>
            );
          }}
        </For>
        <LogLoadingIndicator>
          <LogLoadingIndicatorIcon>
            <IconBoltSolid />
          </LogLoadingIndicatorIcon>
          <LogLoadingIndicatorCopy>
            Tailing logs&hellip;
          </LogLoadingIndicatorCopy>
        </LogLoadingIndicator>
      </LogList>
    </>
  );
}

function LogLevel(props: { level?: string }) {
  props = mergeProps({ level: "info" }, props);
  return (
    <Tag size="small" level={props.level === "error" ? "danger" : "info"}>
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
