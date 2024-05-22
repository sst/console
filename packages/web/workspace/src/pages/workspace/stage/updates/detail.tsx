import { For, Show, Match, Switch, createEffect, createMemo } from "solid-js";
import { useReplicache } from "$/providers/replicache";
import { Link, useParams } from "@solidjs/router";
import { StateUpdateStore } from "$/data/app";
import { DateTime } from "luxon";
import { useStageContext } from "../context";
import { CMD_MAP, STATUS_MAP, errorCountCopy, UpdateStatusIcon } from "./list";
import { styled } from "@macaron-css/solid";
import { formatDuration, formatSinceTime } from "$/common/format";
import { Row, Tag, Text, Stack, theme, utility } from "$/ui";

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

const PageTitle = styled("h1", {
  base: {
    ...utility.row(3),
    alignItems: "center",
  },
});

const PageTitleCopy = styled("h1", {
  base: {
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_2xl,
    fontWeight: theme.font.weight.medium,
  },
});

const PageTitlePrefix = styled("span", {
  base: {
    marginRight: 1,
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_xl,
    fontWeight: theme.font.weight.regular,
  },
});

const PageTitleStatus = styled("p", {
  base: {
    marginLeft: `calc(${theme.space[3]} + 12px)`,
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary.base,
  },
});

const ErrorInfo = styled("div", {
  base: {
    padding: theme.space[4],
    borderRadius: theme.borderRadius,
    backgroundColor: theme.color.background.red,
    fontSize: theme.font.size.sm,
    lineHeight: theme.font.lineHeight,
    color: `hsla(${theme.color.red.l2}, 100%)`,
  },
});

const Sidebar = styled("div", {
  base: {
    flex: "0 0 auto",
    width: 300,
    paddingTop: theme.space[1],
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
  const update = StateUpdateStore.get.watch(rep, () => [ctx.stage.id, params.updateID]);

  const errors = () => update() && update().errors ? update().errors : 0;
  const status = createMemo(() => {
    if (!update()) return;
    return update().time.completed
      ? update().errors
        ? "error"
        : "updated"
      // : update().time.canceled
      //   ? "canceled"
      //   : update().time.queued
      //     ? "queued"
      : "updating";
  });

  return (
    <Switch>
      <Match when={update()}>
        <Container>
          <Content>
            <Stack space="4">
              <Stack space="2.5">
                <PageTitle>
                  <UpdateStatusIcon status={status()} />
                  <PageTitleCopy>
                    Update <PageTitlePrefix>#</PageTitlePrefix>{update().id}
                  </PageTitleCopy>
                </PageTitle>
                <PageTitleStatus>{
                  status() === "error"
                    ? errorCountCopy(errors())
                    : STATUS_MAP[status()!]
                }</PageTitleStatus>
              </Stack>
              <Show when={update().errors}>
                <ErrorInfo>
                  Invalid component name "FunctionA". Component names must be unique.
                </ErrorInfo>
              </Show>
            </Stack>
          </Content>
          <Sidebar>
            <Stack space="7">
              <Stack space="2">
                <PanelTitle>Started</PanelTitle>
                <Text
                  color="secondary"
                  title={update().time.started
                    ? DateTime.fromISO(update().time.started!).toLocaleString(
                      DateTime.DATETIME_FULL,
                    )
                    : undefined
                  }
                >
                  {
                    update().time.started
                      ? formatSinceTime(DateTime.fromISO(update().time.started!).toSQL()!, true)
                      : "—"
                  }
                </Text>
              </Stack>
              <Stack space="2">
                <PanelTitle>Duration</PanelTitle>
                <Text color="secondary">
                  {
                    update().time.started && update().time.completed
                      ? formatDuration(
                        DateTime.fromISO(update().time.completed!)
                          .diff(DateTime.fromISO(update().time.started!))
                          .as("milliseconds"),
                        true
                      )
                      : "—"
                  }
                </Text>
              </Stack>
              <Stack space="2">
                <PanelTitle>Command</PanelTitle>
                <PanelValueMono>
                  {CMD_MAP[update().command]}
                </PanelValueMono>
              </Stack>
            </Stack>
          </Sidebar>
        </Container>
      </Match>
    </Switch>
  );
}
