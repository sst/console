import { theme } from "$/ui/theme";
import { Link, useParams } from "@solidjs/router";
import { styled } from "@macaron-css/solid";
import { Show, Switch, Match, createMemo, createEffect, For } from "solid-js";
import { IconCheck, IconNoSymbol } from "$/ui/icons";
import { IconArrowPathSpin } from "$/ui/icons/custom";
import {
  utility,
  Tag,
  Row,
  Stack,
  Text,
  Button,
  Histogram,
  ButtonGroup,
} from "$/ui";
import { formatSinceTime, parseTime } from "$/common/format";
import { IssueCountStore, IssueStore } from "$/data/issue";
import { useReplicache } from "$/providers/replicache";
import { DateTime, Interval } from "luxon";
import { StackTrace } from "../logs/error";
import { bus } from "$/providers/bus";
import { Log, LogTime, LogMessage } from "$/common/invocation";
import { fromPairs } from "remeda";
import { useResourcesContext, useStageContext } from "../context";
import { useInvocations } from "$/providers/invocation";

const DATETIME_NO_TIME = {
  month: "short",
  day: "numeric",
  year: "numeric",
} as const;

const Container = styled("div", {
  base: {
    ...utility.row(6),
    padding: theme.space[4],
  },
});

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

const PanelTitle = styled("span", {
  base: {
    ...utility.text.label,
    fontSize: theme.font.size.mono_sm,
    color: theme.color.text.dimmed.base,
  },
});

const StackTraceBackground = styled("div", {
  base: {
    backgroundColor: theme.color.background.surface,
    borderRadius: theme.borderRadius,
    overflow: "hidden",
  },
});

export const StackTraceEmpty = styled("div", {
  base: {
    ...utility.row(2),
    alignItems: "center",
    padding: theme.space[5],
  },
});

export const PanelEmptyCopy = styled("span", {
  base: {
    lineHeight: "normal",
    fontSize: theme.font.size.sm,
    color: theme.color.text.dimmed.surface,
  },
});

const LogsBackground = styled("div", {
  base: {
    backgroundColor: theme.color.background.surface,
    borderRadius: theme.borderRadius,
    padding: `0 ${theme.space[4]}`,
  },
});

export const LogsLoading = styled("div", {
  base: {
    ...utility.row(2),
    alignItems: "center",
    padding: `${theme.space[5]} 0`,
  },
});

export const LogsLoadingIcon = styled("div", {
  base: {
    width: 16,
    height: 16,
    opacity: theme.iconOpacity,
    color: theme.color.text.dimmed.surface,
  },
});

const FunctionLink = styled(Link, {
  base: {
    cursor: "pointer",
    wordBreak: "break-all",
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
const FeedbackCopy = styled("span", {
  base: {
    lineHeight: 1.4,
    fontSize: theme.font.size.sm,
  },
});

export function Detail() {
  const params = useParams();
  const ctx = useStageContext();
  const rep = useReplicache();
  const invocations = useInvocations();
  const issue = IssueStore.get.watch(rep, () => [ctx.stage.id, params.issueID]);

  const status = createMemo(() => {
    if (issue()?.timeIgnored) return "ignored";
    if (issue()?.timeResolved) return "resolved";
    return "active";
  });

  createEffect(async () => {
    if (!issue()) return;
    if (issue()?.invocation) return;
    await fetch(
      import.meta.env.VITE_API_URL +
        "/rest/log?" +
        new URLSearchParams({
          pointer: JSON.stringify(issue()!.pointer),
          stageID: issue()!.stageID,
          groupID: issue()!.group,
        }),
      {
        headers: {
          authorization: rep().auth,
          "x-sst-workspace": issue()!.workspaceID,
        },
      }
    ).then((x) => x.json());
  });

  const invocation = createMemo(
    () => issue()?.invocation || invocations.forSource(issue()?.id).at(0)
  );

  const name = createMemo(() => issue()?.pointer?.logGroup.split("/").at(-1));
  const resources = useResourcesContext();
  const fn = createMemo(() =>
    resources()
      .flatMap((x) =>
        name() && x.type === "Function" && x.metadata.arn.endsWith(name()!)
          ? [x]
          : []
      )
      .at(0)
  );

  const min = DateTime.now()
    .startOf("hour")
    .minus({ hours: 24 })
    .toSQL({ includeOffset: false })!;

  const counts = IssueCountStore.forIssue.watch(
    rep,
    () => [issue()?.group || "unknown"],
    (items) => items.filter((item) => item.hour > min)
  );
  const histogram = createMemo(() => {
    const hours = fromPairs(
      counts().map((item) => [
        parseTime(item.hour).toSQL({ includeOffset: false })!,
        item.count,
      ])
    );
    return Interval.fromDateTimes(
      DateTime.now().toUTC().startOf("hour").minus({ hours: 23 }),
      DateTime.now().toUTC().startOf("hour").plus({ hours: 1 })
    )
      .splitBy({ hours: 1 })
      .map((interval) => interval.start!.toSQL({ includeOffset: false })!)
      .map((hour) => ({ label: hour, value: hours[hour] || 0 }));
  });

  createEffect(() => {
    console.log("count", counts());
    console.log("histogram", histogram());
    console.log({ issue: issue(), invocation: invocation() });
  });

  return (
    <Show when={issue()}>
      <Container>
        <Content>
          <Stack space="7">
            <Stack space="2">
              <Text break code size="mono_2xl" weight="medium">
                {issue().error}
              </Text>
              <Stack space="0" horizontal="start">
                <Text break code leading="loose" size="mono_base">
                  {issue().message}
                </Text>
                <FunctionLink href={`../../resources/logs/${fn()?.id}`}>
                  {fn()?.metadata.handler}
                </FunctionLink>
              </Stack>
            </Stack>
            <Stack space="2">
              <PanelTitle>Stack Trace</PanelTitle>
              <StackTraceBackground>
                <Show
                  when={issue().stack?.length}
                  fallback={
                    <StackTraceEmpty>
                      <PanelEmptyCopy>No stack trace available</PanelEmptyCopy>
                    </StackTraceEmpty>
                  }
                >
                  <StackTrace stack={issue().stack || []} />
                </Show>
              </StackTraceBackground>
            </Stack>
            <Stack space="2">
              <Show
                when={invocation()?.logs.length}
                fallback={<PanelTitle>Logs</PanelTitle>}
              >
                <PanelTitle
                  title={DateTime.fromMillis(invocation()?.logs[0].timestamp!)
                    .toUTC()
                    .toLocaleString(DateTime.DATETIME_FULL)}
                >
                  Logs —{" "}
                  {DateTime.fromMillis(
                    invocation()?.logs[0].timestamp!
                  ).toLocaleString(DATETIME_NO_TIME)}
                </PanelTitle>
              </Show>
              <LogsBackground>
                <Show
                  when={invocation()?.logs.length}
                  fallback={
                    <LogsLoading>
                      <LogsLoadingIcon>
                        <IconArrowPathSpin />
                      </LogsLoadingIcon>
                      <PanelEmptyCopy>Loading logs &hellip;</PanelEmptyCopy>
                    </LogsLoading>
                  }
                >
                  <For each={invocation()?.logs || []}>
                    {(entry) => (
                      <Log>
                        <LogTime
                          title={DateTime.fromMillis(entry.timestamp)
                            .toUTC()
                            .toLocaleString(
                              DateTime.DATETIME_FULL_WITH_SECONDS
                            )}
                        >
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </LogTime>
                        <LogMessage>{entry.message}</LogMessage>
                      </Log>
                    )}
                  </For>
                </Show>
              </LogsBackground>
            </Stack>
          </Stack>
        </Content>
        <Sidebar>
          <Stack space="7">
            <ButtonGroup>
              <Button
                grouped="left"
                color="secondary"
                style={{ flex: "1 1 auto" }}
                active={Boolean(issue().timeIgnored)}
                onClick={() =>
                  issue().timeIgnored
                    ? rep().mutate.issue_unignore([issue()!.id])
                    : rep().mutate.issue_ignore([issue()!.id])
                }
              >
                <ButtonIcon>
                  <IconNoSymbol />
                </ButtonIcon>
                Ignore
              </Button>
              <Button
                grouped="right"
                color="secondary"
                style={{ flex: "1 1 auto" }}
                active={Boolean(issue().timeResolved)}
                onClick={() =>
                  issue().timeResolved
                    ? rep().mutate.issue_unresolve([issue()!.id])
                    : rep().mutate.issue_resolve([issue()!.id])
                }
              >
                <ButtonIcon>
                  <IconCheck />
                </ButtonIcon>
                Resolve
              </Button>
            </ButtonGroup>
            <Stack space="2">
              <PanelTitle>Last 24hrs</PanelTitle>
              <Histogram
                width={300}
                height={40}
                units="Errors"
                currentTime={Date.now()}
                data={histogram()}
              />
            </Stack>
            <Stack space="2">
              <PanelTitle>Status</PanelTitle>
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
              <PanelTitle>Last Seen</PanelTitle>
              <Text
                title={parseTime(issue().timeSeen).toLocaleString(
                  DateTime.DATETIME_FULL
                )}
                color="secondary"
              >
                {formatSinceTime(issue().timeSeen, true)}
              </Text>
            </Stack>
            <Stack space="2">
              <PanelTitle>First Seen</PanelTitle>
              <Text
                title={parseTime(issue().timeCreated).toLocaleString(
                  DateTime.DATETIME_FULL
                )}
                color="secondary"
              >
                {formatSinceTime(issue().timeCreated, true)}
              </Text>
            </Stack>
            <Stack space="2">
              <PanelTitle>Feedback</PanelTitle>
              <FeedbackCopy>
                <Text size="sm" color="secondary">
                  Does something not look right?
                </Text>{" "}
                <a href="https://sst.dev/discord" target="_blank">
                  Send us a message in #console on Discord.
                </a>
              </FeedbackCopy>
            </Stack>
          </Stack>
        </Sidebar>
      </Container>
    </Show>
  );
}
