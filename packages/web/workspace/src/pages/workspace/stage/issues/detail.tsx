import { theme } from "$/ui/theme";
import { Link, useParams } from "@solidjs/router";
import { styled } from "@macaron-css/solid";
import {
  Show,
  Switch,
  Match,
  ComponentProps,
  createResource,
  createMemo,
  createEffect,
  For,
} from "solid-js";
import { IconCheck, IconNoSymbol, IconViewfinderCircle } from "$/ui/icons";
import { Tag, Row, Stack, Text, Button, ButtonGroup } from "$/ui";
import { formatNumber, formatSinceTime, parseTime } from "$/common/format";
import { IssueStore } from "$/data/issue";
import { useReplicache } from "$/providers/replicache";
import { DateTime } from "luxon";
import { StackTrace } from "../logs/error";
import { useWorkspace } from "../../context";
import { bus } from "$/providers/bus";
import { LogStore, clearLogStore } from "$/data/log";
import { LogEntry, LogEntryMessage, LogEntryTime } from "../logs";

const Content = styled("div", {
  base: {
    flex: "1 1 auto",
  },
});

const Sidebar = styled("div", {
  base: {
    flex: "0 0 auto",
    width: 300,
  },
});

const StackTraceBackground = styled("div", {
  base: {
    backgroundColor: theme.color.background.surface,
    borderRadius: theme.borderRadius,
    overflow: "hidden",
  },
});

const LogsMock = styled("div", {
  base: {
    backgroundColor: theme.color.background.surface,
    borderRadius: theme.borderRadius,
    padding: `0 ${theme.space[5]}`,
  },
});

const LogsMockRow = styled("div", {
  base: {
    borderTop: `1px solid ${theme.color.divider.surface}`,
    height: 50,
    ":first-child": {
      borderTop: "none",
    },
  },
});

const FunctionLink = styled(Link, {
  base: {
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_sm,
    lineHeight: theme.font.lineHeight,
  },
});

const ButtonIcon = styled("span", {
  base: {
    width: 14,
    height: 14,
    marginRight: 6,
    verticalAlign: -2,
    display: "inline-block",
    opacity: theme.iconOpacity,
  },
});

export function Detail() {
  const params = useParams();
  const rep = useReplicache();
  const issue = IssueStore.watch.get(rep, () => params.issueID);
  const status = createMemo(() => {
    if (issue()?.timeIgnored) return "ignored";
    if (issue()?.timeResolved) return "resolved";
    return "active";
  });
  createEffect(async () => {
    if (!issue()) return;
    const result = await fetch(
      import.meta.env.VITE_API_URL +
        "/rest/log?" +
        new URLSearchParams({
          pointer: JSON.stringify(issue()!.pointer),
          stageID: issue()!.stageID,
          groupID: issue()!.id,
        }),
      {
        headers: {
          authorization: rep().auth,
          "x-sst-workspace": issue()!.workspaceID,
        },
      },
    ).then((x) => x.json());
    clearLogStore(issue()!.id);
    bus.emit("log", result);
  });

  const invocation = createMemo(() =>
    Object.values(LogStore[issue()?.id] || {}).at(0),
  );

  return (
    <Show when={issue()}>
      <Row space="6" style={{ padding: `${theme.space[4]}` }}>
        <Content>
          <Stack space="7">
            <Stack space="2">
              <Text code size="mono_2xl" weight="medium">
                {issue().error}
              </Text>
              <Stack space="0">
                <Text code leading="loose" size="mono_base">
                  {issue().message}
                </Text>
                <FunctionLink href="/link/to/logs">
                  /packages/functions/src/events/log-poller-status.handler
                </FunctionLink>
              </Stack>
            </Stack>
            <Stack space="2">
              <Text label on="surface" size="mono_sm" color="dimmed">
                Stack Trace
              </Text>
              <StackTraceBackground>
                <StackTrace stack={issue().stack || []} />
              </StackTraceBackground>
            </Stack>
            <Stack space="2">
              <Text label on="surface" size="mono_sm" color="dimmed">
                Logs
              </Text>
              <LogsMock>
                <For each={invocation()?.logs || []}>
                  {(entry, i) => (
                    <LogEntry>
                      <LogEntryTime>
                        {entry.timestamp.toLocaleTimeString()}
                      </LogEntryTime>
                      <LogEntryMessage>{entry.message}</LogEntryMessage>
                    </LogEntry>
                  )}
                </For>
              </LogsMock>
            </Stack>
          </Stack>
        </Content>
        <Sidebar>
          <Stack space="7">
            <ButtonGroup>
              <Button
                grouped="left"
                data-state-active={Boolean(issue().timeIgnored)}
                onClick={() => rep().mutate.issue_ignore([issue()!.id])}
                color="secondary"
                style={{ flex: "1 1 auto" }}
              >
                <ButtonIcon>
                  <IconNoSymbol />
                </ButtonIcon>
                Ignore
              </Button>
              <Button
                onClick={() => rep().mutate.issue_resolve([issue()!.id])}
                data-state-active={Boolean(issue().timeResolved)}
                grouped="right"
                color="secondary"
                style={{ flex: "1 1 auto" }}
              >
                <ButtonIcon>
                  <IconCheck />
                </ButtonIcon>
                Resolve
              </Button>
            </ButtonGroup>
            <Stack space="2">
              <Text label on="surface" size="mono_sm" color="dimmed">
                Status
              </Text>
              <Row>
                <Switch>
                  <Match when={status() === "active"}>
                    <Tag level="caution">Active</Tag>
                  </Match>
                  <Match when={status() === "ignored"}>
                    <Tag level="info">Ignored</Tag>
                  </Match>
                  <Match when={status() === "resolved"}>
                    <Tag level="tip">Resolved</Tag>
                  </Match>
                </Switch>
              </Row>
            </Stack>
            <Stack space="2">
              <Text label on="surface" size="mono_sm" color="dimmed">
                Last Seen
              </Text>
              <Text
                title={parseTime(issue().timeUpdated).toLocaleString(
                  DateTime.DATETIME_FULL,
                )}
                color="secondary"
              >
                {formatSinceTime(issue().timeUpdated, true)}
              </Text>
            </Stack>
            <Stack space="2">
              <Text label on="surface" size="mono_sm" color="dimmed">
                First Seen
              </Text>
              <Text
                title={parseTime(issue().timeCreated).toLocaleString(
                  DateTime.DATETIME_FULL,
                )}
                color="secondary"
              >
                {formatSinceTime(issue().timeCreated, true)}
              </Text>
            </Stack>
            <Stack space="2">
              <Text label on="surface" size="mono_sm" color="dimmed">
                Events in last 24hrs
              </Text>
              <Text color="secondary" title={(7321).toString()}>
                {formatNumber(7321, true)}
              </Text>
            </Stack>
          </Stack>
        </Sidebar>
      </Row>
    </Show>
  );
}
