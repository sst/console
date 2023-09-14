import { styled } from "@macaron-css/solid";
import { Row, Stack } from "$/ui/layout";
import { IconCheck, IconNoSymbol } from "$/ui/icons";
import {
  utility,
  Alert,
  Text,
  Button,
  Histogram,
  ButtonGroup,
  SplitOptions,
  SplitOptionsOption,
} from "$/ui";
import { formatNumber, formatSinceTime, parseTime } from "$/common/format";
import { Link, useSearchParams } from "@solidjs/router";
import { theme } from "$/ui/theme";
import type { Issue } from "@console/core/issue";
import {
  For,
  Show,
  Switch,
  Match,
  createEffect,
  createMemo,
  createSignal,
} from "solid-js";
import {
  useFunctionsContext,
  useIssuesContext,
  useResourcesContext,
  useStageContext,
} from "../context";
import { useReplicache } from "$/providers/replicache";
import { HeaderSlot } from "../../header";
import { IssueCountStore } from "$/data/issue";
import { DateTime, Interval } from "luxon";
import { filter, fromPairs, pipe, sortBy, sumBy } from "remeda";
import { WarningStore } from "$/data/warning";

const COL_COUNT_WIDTH = 260;
const COL_TIME_WIDTH = 140;

const Content = styled("div", {
  base: {
    padding: theme.space[4],
  },
});

const IssuesHeader = styled("div", {
  base: {
    ...utility.row(4),
    height: 54,
    alignItems: "center",
    padding: theme.space[4],
    border: `1px solid ${theme.color.divider.base}`,
    backgroundColor: theme.color.background.surface,
    borderRadius: `${theme.borderRadius} ${theme.borderRadius} 0 0`,
  },
});

const IssueCol = styled("div", {
  base: {
    minWidth: 0,
  },
  variants: {
    grow: {
      true: {
        flex: "1 1 auto",
      },
      false: {
        flex: "0 0 auto",
      },
    },
    align: {
      left: {
        textAlign: "left",
        justifyContent: "flex-start",
      },
      right: {
        textAlign: "right",
        justifyContent: "flex-end",
      },
    },
  },
  defaultVariants: {
    grow: false,
    align: "left",
  },
});

const IssuesHeaderCol = styled(IssueCol, {
  base: {
    ...utility.row(3.5),
    alignItems: "center",
  },
});

const ButtonIcon = styled("span", {
  base: {
    width: 12,
    height: 12,
    marginRight: 6,
    verticalAlign: -2,
    display: "inline-block",
    opacity: theme.iconOpacity,
  },
});

const IssuesList = styled("div", {
  base: {
    borderRadius: `0 0 ${theme.borderRadius} ${theme.borderRadius}`,
    borderStyle: "solid",
    borderWidth: "0 1px 1px 1px",
    borderColor: theme.color.divider.base,
  },
});

const EmptyIssuesSign = styled("div", {
  base: {
    ...utility.stack(0),
    alignItems: "center",
    justifyContent: "center",
    padding: `${theme.space[32]} ${theme.space[4]}`,
  },
});

export function List() {
  const issues = useIssuesContext();
  const [search, setSearch] = useSearchParams<{
    view: "active" | "ignored" | "resolved";
  }>();
  const view = createMemo(() => search.view || "active");
  const rep = useReplicache();
  const filtered = createMemo(() =>
    pipe(
      issues(),
      filter((item) => {
        if (view() === "active") return !item.timeResolved && !item.timeIgnored;
        if (view() === "ignored") return Boolean(item.timeIgnored);
        if (view() === "resolved") return Boolean(item.timeResolved);
        return false;
      }),
      sortBy([(item) => item.timeSeen, "desc"])
    )
  );

  const stage = useStageContext();

  const warnings = WarningStore.watch.scan(
    rep,
    (item) =>
      item.stageID === stage.stage.id && item.type === "log_subscription"
  );
  const resources = useResourcesContext();
  const fns = createMemo(() =>
    resources().flatMap((item) => (item.type === "Function" ? [item] : []))
  );

  const [selected, setSelected] = createSignal<string[]>([]);
  let form!: HTMLFormElement;

  function reset() {
    form.reset();
    setSelected([]);
  }

  createEffect(() => {
    view();
    reset();
  });

  return (
    <>
      <HeaderSlot>
        <SplitOptions size="sm">
          <SplitOptionsOption
            onClick={() => setSearch({ view: "active" })}
            selected={view() === "active"}
          >
            Active
          </SplitOptionsOption>
          <SplitOptionsOption
            onClick={() => setSearch({ view: "ignored" })}
            selected={view() === "ignored"}
          >
            Ignored
          </SplitOptionsOption>
          <SplitOptionsOption
            onClick={() => setSearch({ view: "resolved" })}
            selected={view() === "resolved"}
          >
            Resolved
          </SplitOptionsOption>
        </SplitOptions>
      </HeaderSlot>
      <Content>
        <Stack space="4">
          <Show when={warnings().length}>
            <Alert
              level="info"
              controls={
                <Row>
                  <Button
                    onClick={() => {
                      rep().mutate.issue_subscribe({
                        stageID: stage.stage.id,
                      });
                    }}
                    color="secondary"
                  >
                    Retry Enabling Issues
                  </Button>
                </Row>
              }
              details={warnings()
                .map((item) => {
                  const reason = (function () {
                    if (item.data.error === "noisy") return "Rate Limited";
                    if (item.data.error === "unknown")
                      return "Unknown error: " + item.data.message;
                    if (item.data.error === "limited")
                      return "Too many existing log subscriber";
                    if (item.data.error === "permissions")
                      return "Missing permissions to add log subscriber";
                  })();
                  return `${
                    resources()
                      .flatMap((x) =>
                        x.id === item.target && x.type === "Function" ? [x] : []
                      )
                      .at(0)?.metadata.handler
                  } (${reason})`;
                })
                .join("\n")}
            >
              There was a problem enabling Issues for your account.{" "}
              <a href="htts://sst.dev/discord">Contact us on Discord.</a>
            </Alert>
          </Show>
          <form
            ref={form}
            onSubmit={(e) => e.preventDefault()}
            onChange={(e) => {
              const issues = [
                ...e.currentTarget.querySelectorAll<HTMLInputElement>(
                  "input[name='issue']:checked"
                ),
              ].map((i) => i.value);
              setSelected(issues);
            }}
          >
            <IssuesHeader>
              <IssuesHeaderCol>
                <IssueCheckbox
                  name="select-all"
                  onChange={(e) => {
                    for (const input of form.querySelectorAll<HTMLInputElement>(
                      "input[type='checkbox']"
                    )) {
                      input.checked = e.currentTarget.checked;
                    }
                  }}
                  type="checkbox"
                />
              </IssuesHeaderCol>
              <IssuesHeaderCol grow>
                <Text
                  code
                  uppercase
                  on="surface"
                  size="mono_sm"
                  weight="medium"
                  color="dimmed"
                >
                  Error
                </Text>
                <Show when={selected().length > 0}>
                  <ButtonGroup>
                    <Button
                      active={search.view === "ignored"}
                      onClick={() => {
                        search.view === "ignored"
                          ? rep().mutate.issue_unignore(selected())
                          : rep().mutate.issue_ignore(selected());
                        reset();
                      }}
                      size="sm"
                      grouped="left"
                      color="secondary"
                    >
                      <ButtonIcon>
                        <IconNoSymbol />
                      </ButtonIcon>
                      Ignore
                    </Button>
                    <Button
                      active={search.view === "resolved"}
                      onClick={() => {
                        search.view === "resolved"
                          ? rep().mutate.issue_unresolve(selected())
                          : rep().mutate.issue_resolve(selected());
                        reset();
                      }}
                      size="sm"
                      grouped="right"
                      color="secondary"
                    >
                      <ButtonIcon>
                        <IconCheck />
                      </ButtonIcon>
                      Resolve
                    </Button>
                  </ButtonGroup>
                </Show>
              </IssuesHeaderCol>
              <IssuesHeaderCol
                align="right"
                style={{ width: `${COL_COUNT_WIDTH}px` }}
                title="Events in the last 24 hours"
              >
                <Text
                  code
                  uppercase
                  on="surface"
                  size="mono_sm"
                  color="dimmed"
                  weight="medium"
                >
                  Last 24hrs
                </Text>
              </IssuesHeaderCol>
              <IssuesHeaderCol
                align="right"
                style={{ width: `${COL_TIME_WIDTH}px` }}
                title="Latest occurrence of the error"
              >
                <Text
                  code
                  uppercase
                  on="surface"
                  color="dimmed"
                  size="mono_sm"
                  weight="medium"
                >
                  Time
                </Text>
              </IssuesHeaderCol>
            </IssuesHeader>
            <IssuesList>
              <Show
                when={filtered().length !== 0}
                fallback={
                  <EmptyIssuesSign>
                    <Text size="lg" color="dimmed">
                      <Switch>
                        <Match when={view() === "active"}>No new issues</Match>
                        <Match when={view() === "ignored"}>
                          No ignored issues
                        </Match>
                        <Match when={view() === "resolved"}>
                          No resolved issues
                        </Match>
                      </Switch>
                    </Text>
                  </EmptyIssuesSign>
                }
              >
                <For each={filtered()}>
                  {(issue, i) => {
                    const name = createMemo(() =>
                      issue.pointer?.logGroup.split("/").at(-1)
                    );
                    const fn = createMemo(() =>
                      fns().find(
                        (x) => name() && x.metadata.arn.endsWith(name()!)
                      )
                    );
                    return (
                      <IssueRow
                        issue={issue}
                        unread={view() === "active"}
                        last={i() === filtered().length - 1}
                        handler={fn()?.metadata.handler || ""}
                      />
                    );
                  }}
                </For>
              </Show>
            </IssuesList>
          </form>
        </Stack>
      </Content>
    </>
  );
}

const IssueRoot = styled("label", {
  base: {
    ...utility.row(4),
    padding: theme.space[4],
    //overflow: "hidden",
    borderTop: `1px solid ${theme.color.divider.base}`,
    alignItems: "center",
    ":first-child": {
      borderTop: 0,
    },
  },
});

const IssueError = styled(Link, {
  base: {
    overflow: "hidden",
    lineHeight: "normal",
    whiteSpace: "nowrap",
    cursor: "pointer",
    textOverflow: "ellipsis",
  },
  variants: {
    weight: {
      regular: {
        fontWeight: 400,
      },
      medium: {
        fontWeight: 500,
      },
      semibold: {
        fontWeight: 600,
      },
    },
  },
  defaultVariants: {
    weight: "regular",
  },
});

const IssueCheckbox = styled("input", {
  base: {
    cursor: "pointer",
  },
});

type IssueProps = {
  last: boolean;
  handler: string;
  unread: boolean;
  issue: Issue.Info;
};

function IssueRow(props: IssueProps) {
  const rep = useReplicache();
  const min = DateTime.now()
    .startOf("hour")
    .minus({ hours: 24 })
    .toSQL({ includeOffset: false })!;

  const counts = IssueCountStore.watch.scan(
    rep,
    (item) => item.group === props.issue.group && item.hour > min
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

  return (
    <IssueRoot>
      <IssueCol>
        <IssueCheckbox name="issue" value={props.issue.id} type="checkbox" />
      </IssueCol>
      <IssueCol grow>
        <Stack space="2">
          <Row horizontal="start">
            <IssueError
              href={props.issue.id}
              weight={props.unread ? "medium" : "regular"}
            >
              {props.issue.error}
            </IssueError>
          </Row>
          <Stack space="1">
            <Text line size="sm" leading="normal">
              {props.issue.message}
            </Text>

            <Text code line leading="normal" size="mono_sm" color="dimmed">
              {props.handler}
            </Text>
          </Stack>
        </Stack>
      </IssueCol>
      <IssueCol align="right" style={{ width: `${COL_COUNT_WIDTH}px` }}>
        <Histogram
          height={30}
          units="Errors"
          data={histogram()}
          width={COL_COUNT_WIDTH}
          currentTime={Date.now()}
          tooltipAlignment={props.last ? "top" : "bottom"}
        />
      </IssueCol>
      <IssueCol align="right" style={{ width: `${COL_TIME_WIDTH}px` }}>
        <Text
          line
          size="sm"
          color="dimmed"
          leading="normal"
          title={parseTime(props.issue.timeSeen).toLocaleString()}
        >
          {formatSinceTime(props.issue.timeSeen)}
        </Text>
      </IssueCol>
    </IssueRoot>
  );
}
