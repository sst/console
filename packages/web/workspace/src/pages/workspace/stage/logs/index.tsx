import { useReplicache } from "$/providers/replicache";
import { Tag, Text } from "$/ui";
import { Dropdown } from "$/ui/dropdown";
import {
  IconBolt,
  IconClock,
  IconCheck,
  IconCalendar,
  IconArrowDown,
  IconBoltSolid,
  IconArrowsUpDown,
  IconChevronUpDown,
  IconMagnifyingGlass,
  IconEllipsisVertical,
  IconArrowPathRoundedSquare,
} from "$/ui/icons";
import { IconAws, IconArrowPathSpin } from "$/ui/icons/custom";
import { Row, Stack, Fullscreen } from "$/ui/layout";
import { TextButton, IconButton } from "$/ui/button";
import { Warning } from "../";
import { theme } from "$/ui/theme";
import { utility } from "$/ui/utility";
import { globalKeyframes, style } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { Link, useParams, useSearchParams } from "@solidjs/router";
import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  onMount,
} from "solid-js";
import { useResourcesContext, useStageContext } from "../context";
import type { Resource } from "@console/core/app/resource";
import { useCommandBar } from "../../command-bar";
import { DATETIME_LONG, parseTime } from "$/common/format";
import { createStore, unwrap } from "solid-js/store";
import { Invoke, InvokeControl } from "./invoke";
import { createId } from "@paralleldrive/cuid2";
import { LogSearchStore } from "$/data/log-search";
import { DialogRange, DialogRangeControl } from "./dialog-range";
import { InvocationRow } from "$/common/invocation";
import { useInvocations } from "$/providers/invocation";
import { DateTime } from "luxon";
import { useWorkspace } from "../../context";
import { useDummy } from "$/providers/dummy";
import { createScan, createScan2 } from "$/data/store";
import type { Invocation } from "@console/core/log";
import { sortBy } from "remeda";
import { getLogInfo } from "../issues/common";
import { createEventListener } from "@solid-primitives/event-listener";

const LogSwitchButton = styled("button", {
  base: {
    ...utility.row(1),
    alignItems: "center",
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_base,
    color: theme.color.text.secondary.base,
  },
});

const LogSwitchIcon = styled("div", {
  base: {
    width: 18,
    height: 18,
    opacity: theme.iconOpacity,
  },
});

export const LogList = styled("div", {
  base: {},
});

export const LogLoadingIndicator = styled("div", {
  base: {
    ...utility.row(0),
    height: 52,
    alignItems: "center",
    justifyContent: "space-between",
    padding: `0 ${theme.space[3]}`,
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: theme.color.divider.base,
    borderRadius: `${theme.borderRadius} ${theme.borderRadius} 0 0`,
  },
});

export const LogLoadingIndicatorIcon = styled("div", {
  base: {
    padding: 2,
    width: 20,
    height: 20,
    opacity: theme.iconOpacity,
  },
  variants: {
    pulse: {
      true: {},
      false: {},
    },
    glow: {
      true: {
        color: theme.color.accent,
      },
      false: {
        color: theme.color.icon.dimmed,
      },
    },
  },
  defaultVariants: {
    pulse: true,
    glow: false,
  },
});

export const LogLoadingIndicatorIconSvg = style({
  selectors: {
    [`${LogLoadingIndicatorIcon.selector({ pulse: true })} &`]: {
      animation: "glow-pulse 1.7s linear infinite alternate",
    },
  },
});

globalKeyframes("glow-pulse", {
  "0%": {
    opacity: 0.3,
    filter: `drop-shadow(0 0 0px ${theme.color.accent})`,
  },
  "50%": {
    opacity: 1,
    filter: `drop-shadow(0 0 1px ${theme.color.accent})`,
  },
  "100%": {
    opacity: 0.3,
    filter: `drop-shadow(0 0 0px ${theme.color.accent})`,
  },
});

const LogEmpty = styled("div", {
  base: {
    ...utility.stack(4),
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "solid",
    borderWidth: "0 1px 1px 1px",
    borderColor: theme.color.divider.base,
    borderRadius: `0 0 ${theme.borderRadius} ${theme.borderRadius}`,
  },
});

const LogMoreIndicator = styled("div", {
  base: {
    ...utility.row(2),
    alignItems: "center",
    padding: `${theme.space[3]} ${theme.space[3]}`,
    borderStyle: "solid",
    borderWidth: "0 1px 1px 1px",
    borderColor: theme.color.divider.base,
    borderRadius: `0 0 ${theme.borderRadius} ${theme.borderRadius}`,
  },
});

const LogMoreIndicatorIcon = styled("div", {
  base: {
    padding: 2,
    width: 20,
    height: 20,
    color: theme.color.text.dimmed.base,
    opacity: theme.iconOpacity,
  },
});

const [pollerCache, setPollerCache] = createStore<{ [key: string]: number }>(
  {}
);

export function Logs() {
  const stage = useStageContext();
  const invocationsContext = useInvocations();
  const bar = useCommandBar();
  const [id, setID] = createStore<{
    search: string;
    poller: string;
  }>({
    search: createId(),
    poller: createId(),
  });

  const params = useParams();
  const [query, setQuery] = useSearchParams<{
    dummy?: string;
    end?: string;
    logGroup?: string;
    view: string;
  }>();
  const resources = useResourcesContext();
  const resource = createMemo(
    () =>
      resources().find((x) => x.id === params.resourceID) as
        | Resource.InfoByType<"Function">
        | undefined
  );

  const logGroup = createMemo(() => {
    if (query.logGroup) return query.logGroup;
    const r = resource();
    if (!r) return "";
    const logGroup = (() => {
      if (r.type === "Function") {
        return `/aws/lambda/${r.metadata.arn.split(":").pop()}`;
      }
      return "";
    })();
    return logGroup;
  });

  bar.register("logs", async () => {
    if (mode() === "live") return [];
    return [
      {
        title: "Live logs",
        category: "logs",
        disabled: query.view === "tail",
        run: (bar) => {
          setQuery(
            {
              view: "tail",
              end: undefined,
            },
            { replace: true }
          );
          bar.hide();
        },
        icon: IconBolt,
      },
      {
        title: "Past logs",
        category: "logs",
        disabled: query.view === "recent",
        run: (bar) => {
          setQuery(
            {
              view: "recent",
              end: undefined,
            },
            { replace: true }
          );
          bar.hide();
        },
        icon: IconClock,
      },
      {
        title: "Jump to...",
        category: "logs",
        run: (bar) => {
          rangeControl.show();
          bar.hide();
        },
        icon: IconCalendar,
      },
      {
        title: "Open in CloudWatch",
        category: "logs",
        disabled: true,
        run: () => {
          const url = `https://${
            stage.stage.region
          }.console.aws.amazon.com/cloudwatch/home?region=${
            stage.stage.region
          }#logsV2:log-groups/log-group/${logGroup().replace(/\//g, "$252F")}`;
          window.open(url, "_blank");
          bar.hide();
        },
        icon: IconAws,
      },
    ];
  });

  const mode = createMemo(() => {
    if (resource()?.enrichment.live) return "live";
    if (query.view === "tail") return "tail";
    return "search";
  });

  createEffect(() => {
    if (!query.view)
      setQuery(
        {
          view: "recent",
        },
        { replace: true }
      );
  });

  const workspace = useWorkspace();
  createEffect(() => {
    const m = mode();
    const lg = logGroup();
    const view = query.view;
    const end = query.end;
    if (m === "live") return;
    if (!lg) return;
    console.log(
      view,
      `https://${
        stage.stage.region
      }.console.aws.amazon.com/cloudwatch/home?region=${
        stage.stage.region
      }#logsV2:log-groups/log-group/${logGroup().replace(/\//g, "$252F")}`
    );

    if (view === "recent") {
      setID("search", createId());
      createSearch();
    }

    if (view === "custom" && end) {
      setID("search", createId());
      createSearch(new Date(end).getTime());
    }

    if (view === "tail") {
      const exists = pollerCache[logGroup()];
      if (exists) return;
      async function run() {
        await fetch(import.meta.env.VITE_API_URL + "/rest/log/tail", {
          method: "POST",
          body: JSON.stringify({
            stageID: stage.stage.id,
            logGroup: logGroup(),
            profileID: await rep().profileID,
          }),
          headers: {
            "x-sst-workspace": workspace().id,
            Authorization: rep().auth,
          },
        });
        setTimeout(run, 3000);
      }
      setPollerCache(logGroup(), Date.now());
      run();
    }
  });

  const rep = useReplicache();

  const activeSearch = LogSearchStore.get.watch(rep, () => [id.search]);

  async function createSearch(end?: number) {
    if (dummy()) return;
    rep().mutate.log_search({
      id: id.search,
      profileID: await rep().profileID,
      stageID: stage.stage.id,
      logGroup: logGroup(),
      timeStart: null,
      timeEnd: end
        ? DateTime.fromMillis(end).toUTC().toSQL({ includeOffset: false })!
        : null,
    });
  }

  const logGroupKey = createMemo(() => {
    const base = logGroup();
    const searchID = id.search;
    const addr = resource()?.addr!;
    if (mode() === "live") return addr;
    if (mode() === "search") return searchID;
    return base + "-tail";
  });

  const dummy = useDummy();
  const dummyInvocations = createScan<Invocation>(
    () => "/invocation",
    rep,
    (all) => sortBy(all, (x) => x.start)
  );

  const invocations = createMemo(() => {
    if (import.meta.env.DEV) {
      if (dummy()) return dummyInvocations();
    }
    const result = invocationsContext.forSource(logGroupKey()) || [];
    if (mode() === "tail" || mode() === "live") return result.slice().reverse();
    return result;
  });

  let invokeControl!: InvokeControl;
  let rangeControl!: DialogRangeControl;

  const logInfo = createMemo(() => getLogInfo(resources(), query.logGroup));

  function moveIndex(offset: -1 | 1) {
    const all = document.querySelectorAll<HTMLElement>(
      `[data-element="invocation"]`
    );
    if (all.length === 0) return;
    console.log(all);
    const f = document.querySelector<HTMLElement>(`[data-focus]`);
    if (!f) {
      if (offset === 1) all.item(0)?.setAttribute("data-focus", "true");
      if (offset === -1) all.item(-1)?.setAttribute("data-focus", "true");
      return;
    }

    const next =
      offset === -1 ? f?.previousElementSibling : f?.nextElementSibling;
    if (!next) return;
    f.removeAttribute("data-focus");
    next.setAttribute("data-focus", "true");
    if (!next.previousElementSibling) {
      next.scrollIntoView({
        block: "end",
      });
      return;
    }
    next.scrollIntoView({
      block: "nearest",
    });
  }
  createEventListener(window, "keypress", (e) => {
    console.log(document.activeElement?.tagName);
    if (document.activeElement?.tagName === "TEXTAREA") return;
    if (e.key === "j") moveIndex(1);
    if (e.key === "k") moveIndex(-1);
    if (e.key === "Enter") {
      document.querySelector<HTMLElement>("[data-focus] > *")?.click();
    }
  });

  createEventListener(window, "keydown", (e) => {
    if (e.key === " ") {
      e.preventDefault();
      const el = document.querySelector<HTMLElement>("[data-focus]");
      if (el?.dataset.expanded) return;
      (el?.firstElementChild as HTMLElement).click();
    }
  });

  createEventListener(window, "keyup", (e) => {
    if (e.key === " ") {
      e.preventDefault();
      document
        .querySelector<HTMLElement>(`[data-focus][data-expanded="true"] > *`)
        ?.click();
    }
  });

  return (
    <Switch>
      <Match when={workspace().timeGated != null && !stage.connected}>
        <Fullscreen inset="stage">
          <Warning
            title="Update billing details"
            description={
              <>
                Your usage is above the free tier,{" "}
                <Link href={`/${workspace().slug}/settings#billing`}>
                  update your billing details
                </Link>
                .<br />
                Note, you can continue using the Console for local stages.
                <br />
                Just make sure `sst dev` is running locally.
              </>
            }
          />
        </Fullscreen>
      </Match>
      <Match when={true}>
        <>
          <Stack space="5" style={{ padding: `${theme.space[4]}` }}>
            <Row space="2" horizontal="between" vertical="center">
              <Stack space="2" vertical="center">
                <Text size="lg" weight="medium">
                  Logs
                </Text>
                <LogSwitchButton onClick={() => bar.show("resource")}>
                  <span>{logInfo()?.name}</span>
                  <LogSwitchIcon>
                    <IconChevronUpDown />
                  </LogSwitchIcon>
                </LogSwitchButton>
              </Stack>
              <Show when={mode() === "live"}>
                <Tag level="tip" style="outline">
                  Local
                </Tag>
              </Show>
            </Row>
            <LogList>
              <LogLoadingIndicator>
                <Row space="2" vertical="center">
                  <LogLoadingIndicatorIcon
                    pulse={mode() !== "search"}
                    glow={
                      (mode() === "live" && stage.connected) ||
                      mode() === "tail"
                    }
                  >
                    <Switch>
                      <Match when={mode() === "live" && !stage.connected}>
                        <IconArrowsUpDown />
                      </Match>
                      <Match when={mode() === "search"}>
                        <IconArrowDown />
                      </Match>
                      <Match when={true}>
                        <IconBoltSolid class={LogLoadingIndicatorIconSvg} />
                      </Match>
                    </Switch>
                  </LogLoadingIndicatorIcon>
                  <Text leading="normal" color="dimmed" size="sm">
                    <Switch>
                      <Match when={mode() === "live" && !stage.connected}>
                        Trying to connect to local `sst dev`&hellip;
                      </Match>
                      <Match when={mode() === "live"}>
                        Tailing logs from local `sst dev`&hellip;
                      </Match>
                      <Match when={mode() === "search"}>
                        <Show when={query.end} fallback="Viewing past logs">
                          <span>
                            Viewing logs older than{" "}
                            {DateTime.fromISO(query.end!).toLocaleString(
                              DATETIME_LONG
                            )}
                          </span>
                        </Show>
                      </Match>
                      <Match when={true}>
                        <Show
                          when={pollerCache[logGroup()]}
                          fallback="Starting tailer"
                        >
                          Tailing logs since{" "}
                          {DateTime.fromMillis(
                            Math.min(
                              invocations().at(-1)?.start || Number.MAX_VALUE,
                              pollerCache[logGroup()]
                            )
                          ).toLocaleString(DATETIME_LONG)}
                        </Show>
                        &hellip;
                      </Match>
                    </Switch>
                  </Text>
                </Row>
                <Row space="3.5" vertical="center">
                  <Show when={mode() !== "search" && invocations().length > 0}>
                    <TextButton
                      onClick={() => {
                        invocationsContext.clear(logGroupKey());
                        setPollerCache(logGroup(), Date.now());
                      }}
                    >
                      Clear
                    </TextButton>
                  </Show>
                  <Show when={mode() === "search" && activeSearch()?.outcome}>
                    <IconButton
                      title="Reload logs"
                      onClick={() => {
                        invocationsContext.clear(logGroupKey());
                        createSearch(
                          query.end ? new Date(query.end).getTime() : undefined
                        );
                      }}
                    >
                      <IconArrowPathRoundedSquare
                        display="block"
                        width={20}
                        height={20}
                      />
                    </IconButton>
                  </Show>
                  <Show when={mode() !== "live"}>
                    <Dropdown size="sm" label="View">
                      <Dropdown.RadioGroup
                        value={query.view}
                        onChange={(val) => {
                          if (val === "custom") return;
                          setQuery(
                            {
                              view: val,
                              end: undefined,
                            },
                            {
                              replace: true,
                            }
                          );
                        }}
                      >
                        <Dropdown.RadioItem closeOnSelect value="tail">
                          <Dropdown.RadioItemLabel>
                            Live
                          </Dropdown.RadioItemLabel>
                          <Dropdown.ItemIndicator>
                            <IconCheck width={14} height={14} />
                          </Dropdown.ItemIndicator>
                        </Dropdown.RadioItem>
                        <Dropdown.RadioItem closeOnSelect value="recent">
                          <Dropdown.RadioItemLabel>
                            Past
                          </Dropdown.RadioItemLabel>
                          <Dropdown.ItemIndicator>
                            <IconCheck width={14} height={14} />
                          </Dropdown.ItemIndicator>
                        </Dropdown.RadioItem>
                        <Dropdown.RadioItem
                          onSelect={() => {
                            setTimeout(() => rangeControl.show(), 0);
                            return;
                          }}
                          closeOnSelect
                          value="custom"
                        >
                          Jump to&hellip;
                        </Dropdown.RadioItem>
                      </Dropdown.RadioGroup>
                    </Dropdown>
                  </Show>
                </Row>
              </LogLoadingIndicator>
              <Show
                when={
                  (mode() === "tail" ||
                    mode() === "live" ||
                    query.view === "recent") &&
                  resource()
                }
              >
                <Invoke
                  onInvoke={() => {}}
                  control={(c) => (invokeControl = c)}
                  resource={resource()!}
                />
              </Show>
              <Show
                when={
                  activeSearch()?.outcome &&
                  mode() === "search" &&
                  invocations().length === 0
                }
              >
                <LogEmpty>
                  <IconMagnifyingGlass
                    width={28}
                    height={28}
                    color={theme.color.icon.dimmed}
                  />
                  <Text center color="dimmed">
                    Could not find any logs
                  </Text>
                </LogEmpty>
              </Show>
              <For each={invocations()}>
                {(invocation, i) => (
                  <InvocationRow
                    onSavePayload={() => {
                      invokeControl.savePayload(
                        structuredClone(unwrap(invocation.input))
                      );
                    }}
                    invocation={invocation}
                    local={mode() === "live"}
                    function={resource()!}
                  />
                )}
              </For>
              <Show when={mode() === "search"}>
                <Switch>
                  <Match when={activeSearch() && !activeSearch().outcome}>
                    <LogMoreIndicator>
                      <LogMoreIndicatorIcon>
                        <IconArrowPathSpin />
                      </LogMoreIndicatorIcon>
                      <Text leading="normal" color="dimmed" size="sm">
                        <Show
                          when={mode() === "search"}
                          fallback={<>Loading&hellip;</>}
                        >
                          Scanning
                          <Show when={activeSearch()?.timeStart}>
                            {" "}
                            to{" "}
                            {parseTime(activeSearch()?.timeStart!)
                              .toLocal()
                              .toLocaleString(DATETIME_LONG)}
                          </Show>
                          &hellip;
                        </Show>
                      </Text>
                    </LogMoreIndicator>
                  </Match>
                  <Match when={mode() === "search" && invocations().length}>
                    <LogMoreIndicator>
                      <LogMoreIndicatorIcon>
                        <IconEllipsisVertical />
                      </LogMoreIndicatorIcon>
                      <Switch>
                        <Match when={activeSearch()?.outcome === "completed"}>
                          <TextButton>No more logs</TextButton>
                        </Match>
                        <Match when={activeSearch()?.outcome === "partial"}>
                          <TextButton
                            onClick={() => {
                              const i = invocations();
                              createSearch(i[i.length - 1]!.start);
                            }}
                          >
                            Load more logs
                          </TextButton>
                        </Match>
                      </Switch>
                    </LogMoreIndicator>
                  </Match>
                </Switch>
              </Show>
            </LogList>
          </Stack>
          <DialogRange
            onSelect={(end) => {
              setQuery({
                view: "custom",
                end: end.toISOString(),
              });
            }}
            control={(control) => (rangeControl = control)}
          />
        </>
      </Match>
    </Switch>
  );
}
