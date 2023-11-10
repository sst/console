import { styled } from "@macaron-css/solid";
import {
  LogList,
  LogLoadingIndicator,
  LogLoadingIndicatorIcon,
  LogLoadingIndicatorIconSvg,
} from "../logs";
import { theme, Text, utility, Row, TextButton } from "$/ui";
import { InvocationRow } from "$/common/invocation";
import { For, Match, Show, Switch, createMemo } from "solid-js";
import { useResourcesContext, useStageContext } from "../context";
import { filter, flatMap, pipe } from "remeda";
import { IconArrowsUpDown, IconBoltSolid } from "$/ui/icons";
import { useInvocations } from "$/providers/invocation";
import {
  KeyboardNavigator,
  createKeyboardNavigator,
} from "$/common/keyboard-navigator";

const Root = styled("div", {
  base: {
    padding: theme.space[4],
    ...utility.stack(5),
  },
});

export function Local() {
  const resources = useResourcesContext();
  const functionByLocalID = createMemo(() =>
    Object.fromEntries(
      pipe(
        resources(),
        filter((item) => item.type === "Function"),
        flatMap((item) =>
          item.type === "Function"
            ? [[item.metadata.localId, item] as const]
            : []
        )
      )
    )
  );
  const ctx = useStageContext();
  const invocationsContext = useInvocations();
  const invocations = createMemo(() =>
    invocationsContext.forSource("all").slice().reverse()
  );
  const navigator = createKeyboardNavigator({
    target: "[data-element='invocation']",
    onSelect: (el) => (el.firstElementChild as HTMLElement).click(),
    onPeek: (el, event) => {
      if (event === "open" && !el.dataset.expanded) {
        (el.firstElementChild as HTMLElement).click();
      }

      if (event === "close" && el.dataset.expanded) {
        (el.firstElementChild as HTMLElement).click();
      }
    },
  });
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
          <div>
            <Show when={invocations().length > 0}>
              <TextButton
                onClick={() => {
                  invocationsContext.clear("all");
                }}
              >
                Clear
              </TextButton>
            </Show>
          </div>
        </LogLoadingIndicator>
        <KeyboardNavigator value={navigator}>
          <For each={invocations()}>
            {(invocation) => (
              <InvocationRow
                mixed
                local
                invocation={invocation}
                function={functionByLocalID()[invocation.source!]}
              />
            )}
          </For>
        </KeyboardNavigator>
      </LogList>
    </Root>
  );
}
