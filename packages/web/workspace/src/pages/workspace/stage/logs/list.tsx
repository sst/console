import {
  For,
  Show,
  Match,
  Switch,
  createMemo,
  createEffect,
  createSignal,
} from "solid-js";
import { Link } from "@solidjs/router";
import { theme } from "$/ui/theme";
import { Row, Stack, Fullscreen } from "$/ui/layout";
import { utility } from "$/ui/utility";
import { styled } from "@macaron-css/solid";
import { useStageContext } from "../context";
import { StateResourceStore } from "$/data/app";
import type { State } from "@console/core/state";
import { useReplicache } from "$/providers/replicache";

const Content = styled("div", {
  base: {
    padding: theme.space[4],
  },
});

const Card = styled("div", {
  base: {
    borderRadius: 4,
    backgroundColor: theme.color.background.surface,
  },
  variants: {
    outline: {
      true: {
        backgroundColor: "transparent",
        border: `1px solid ${theme.color.divider.base}`,
      },
    },
  },
});

const HeaderRoot = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `0 ${theme.space[4]}`,
    height: 50,
    gap: theme.space[6],
  },
});

const HeaderTitle = styled("span", {
  base: {
    color: theme.color.text.primary.surface,
    fontWeight: theme.font.weight.medium,
  },
  variants: {
    outline: {
      true: {
        color: theme.color.text.primary.base,
      },
    },
  },
});

const Children = styled("div", {
  base: {
    ...utility.stack(0),
    padding: `0 ${theme.space[3]}`,
    borderTop: `1px solid ${theme.color.divider.surface}`,
    ":empty": {
      display: "none",
    },
  },
  variants: {
    outline: {
      true: {
        borderColor: theme.color.divider.base,
      },
    },
  },
});

const EmptyResourcesCopy = styled("span", {
  base: {
    fontSize: theme.font.size.lg,
    color: theme.color.text.dimmed.base,
  },
});

export function List() {
  const rep = useReplicache();
  const ctx = useStageContext();
  const resources = StateResourceStore.forStage.watch(rep, () => [
    ctx.stage.id,
  ]);

  const sorted = createMemo(() => sortFunctions(resources()));
  const functions = createMemo(() => sorted()[0]);
  const internals = createMemo(() => sorted()[1]);

  createEffect(() => {
    console.log("Functions", functions());
    console.log("Internal", internals());
  });

  return (
    <Switch>
      <Match when={resources().length && (functions().length || internals().length)}>
        <Content>
          <Stack space="4">
            <Card>
              <HeaderRoot>
                <HeaderTitle>Functions</HeaderTitle>
              </HeaderRoot>
              <Children>
                <For each={functions()}>
                  {(fn) =>
                    <Row>
                      <Link
                        href={`${fn.id}?logGroup=${getLogGroup(fn)}`}
                      >
                        {fn.outputs.handler}
                      </Link>
                      {fn.name}
                      {fn.outputs.runtime}
                      {fn.outputs.memorySize}
                    </Row>
                  }
                </For>
              </Children>
            </Card>
            <Card outline>
              <HeaderRoot>
                <HeaderTitle outline>Internals</HeaderTitle>
              </HeaderRoot>
              <Children>
                <For each={internals()}>
                  {(fn) =>
                    <Row>
                      <Link
                        href={`${fn.id}?logGroup=${getLogGroup(fn)}`}
                      >
                        {fn.name}
                      </Link>
                      {fn.outputs.runtime}
                      {fn.outputs.memorySize}
                    </Row>
                  }
                </For>
              </Children>
            </Card>
          </Stack>
        </Content>
      </Match>
      <Match when={true}>
        <Fullscreen inset="stage">
          <EmptyResourcesCopy>
            Deploy a function to get started!
          </EmptyResourcesCopy>
        </Fullscreen>
      </Match>
    </Switch>
  );
}

type SortedResource = State.Resource & {
  name: string;
  sst?: State.Resource;
};
function sortFunctions(
  resources: State.Resource[],
): [SortedResource[], SortedResource[]] {
  const functions: SortedResource[] = [];
  const internals: SortedResource[] = [];

  resources.forEach((r) => {
    if (r.type !== "aws:lambda/function:Function") { return; }

    const logGroup = getLogGroup(r);

    if (!logGroup) { return; }

    const fn: SortedResource = { ...r, name: getResourceName(r.urn)!, sst: undefined };

    if (r.parent) {
      const parent = resources.find((f) => f.urn === r.parent && f.type === "sst:aws:Function");

      if (parent) {
        fn.name = getResourceName(parent.urn)!;
        fn.sst = { ...parent };

        if (!isInternalFunction(parent)) {
          functions.push(fn);
          return;
        }
      }
    }

    internals.push(fn);
  });

  return [functions, internals];
}

function getResourceName(urn: string) {
  return urn.split("::").at(-1);
}

function getLogGroup(fn: State.Resource) {
  return (fn.outputs
    && fn.outputs.loggingConfig
    && fn.outputs.loggingConfig.logGroup
  )
    ? fn.outputs.loggingConfig.logGroup
    : undefined;
}

function isInternalFunction(fn: State.Resource) {
  return (fn.outputs
    && fn.outputs["_metadata"]
    && fn.outputs["_metadata"].internal
    && fn.outputs["_metadata"].internal === true
  );
}
