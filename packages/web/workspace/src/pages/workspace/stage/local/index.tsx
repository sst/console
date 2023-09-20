import { styled } from "@macaron-css/solid";
import {
  LogList,
  LogLoadingIndicator,
  LogLoadingIndicatorIcon,
  LogLoadingIndicatorIconSvg,
} from "../logs";
import { theme, Text, utility, IconButton, Row, TextButton } from "$/ui";
import { LogStore, clearLogStore } from "$/data/log";
import { InvocationRow } from "$/common/invocation";
import { For, Match, Show, Switch, createMemo } from "solid-js";
import { useResourcesContext, useStageContext } from "../context";
import { createPipe, filter, flatMap, flatten, fromPairs, pipe } from "remeda";
import { bus } from "$/providers/bus";
import { Dropdown } from "$/ui/dropdown";
import {
  IconArrowsUpDown,
  IconArrowDown,
  IconBoltSolid,
  IconArrowPathRoundedSquare,
} from "$/ui/icons";
import { stage } from "@console/core/app/app.sql";
import { search } from "@console/core/log/search";
import { useLocalContext } from "$/providers/local";

const Root = styled("div", {
  base: {
    padding: theme.space[4],
    ...utility.stack(5),
  },
});

export function Local() {
  const resources = useResourcesContext();
  const functionsByGroup = createMemo(() =>
    Object.fromEntries(
      pipe(
        resources(),
        filter((item) => item.type === "Function"),
        flatMap((item) =>
          item.type === "Function"
            ? [[item.metadata.localId, item] as const]
            : [],
        ),
      ),
    ),
  );
  const ctx = useStageContext();
  const invocations = createMemo(() => LogStore.all.slice().reverse());
  return (
    <Root>
      <LogList>
        <LogLoadingIndicator>
          <Row space="2" vertical="center">
            <LogLoadingIndicatorIcon pulse={true} glow={true}>
              <Switch>
                <Match when={!ctx.connected}>
                  <IconArrowsUpDown />
                </Match>
                <Match when={true}>
                  <IconBoltSolid class={LogLoadingIndicatorIconSvg} />
                </Match>
              </Switch>
            </LogLoadingIndicatorIcon>
            <Text leading="normal" color="dimmed" size="sm">
              <Switch>
                <Match when={!ctx.connected}>
                  Trying to connect to local `sst dev`&hellip;
                </Match>
                <Match when={true}>
                  Tailing logs from local `sst dev`&hellip;
                </Match>
              </Switch>
            </Text>
          </Row>
          <Row space="3.5" vertical="center">
            <Show when={invocations().length > 0}>
              <TextButton
                onClick={() => {
                  clearLogStore("all");
                }}
              >
                Clear
              </TextButton>
            </Show>
          </Row>
        </LogLoadingIndicator>
        <For each={invocations()}>
          {(invocation) => (
            <InvocationRow
              mixed
              local
              invocation={invocation}
              function={functionsByGroup()[invocation.group!]}
            />
          )}
        </For>
      </LogList>
    </Root>
  );
}
