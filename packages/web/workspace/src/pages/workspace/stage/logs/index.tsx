import { LogPollerStore } from "$/data/log-poller";
import { useReplicache } from "$/providers/replicache";
import { Tag, Text } from "$/ui";
import { Dropdown } from "$/ui/dropdown";
import {
  IconBolt,
  IconClock,
  IconCheck,
  IconArrowDown,
  IconBoltSolid,
  IconArrowsUpDown,
  IconChevronUpDown,
  IconMagnifyingGlass,
  IconEllipsisVertical,
  IconArrowPathRoundedSquare,
} from "$/ui/icons";
import { IconArrowPathSpin, IconAws } from "$/ui/icons/custom";
import { Row, Stack } from "$/ui/layout";
import { TextButton, IconButton } from "$/ui/button";
import { theme } from "$/ui/theme";
import { utility } from "$/ui/utility";
import { globalKeyframes, style } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  mergeProps,
  untrack,
} from "solid-js";
import { useResourcesContext, useStageContext } from "../context";
import { Resource } from "@console/core/app/resource";
import { useCommandBar } from "../../command-bar";
import { formatSinceTime } from "$/common/format";
import { createStore, produce, unwrap } from "solid-js/store";
import { Invoke, InvokeControl } from "./invoke";
import { createId } from "@paralleldrive/cuid2";
import { LogSearchStore } from "$/data/log-search";
import { DialogRange, DialogRangeControl } from "./dialog-range";
import { ResourceIcon } from "$/common/resource-icon";
import { InvocationRow } from "$/common/invocation";
import { useInvocations } from "$/providers/invocation";
import { DateTime } from "luxon";

const LogSwitchIcon = styled("div", {
  base: {
    top: -1,
    width: 18,
    height: 18,
    position: "relative",
    color: theme.color.icon.secondary,
  },
});

export const LogList = styled("div", {
  base: {
    border: `1px solid ${theme.color.divider.base}`,
    borderRadius: theme.borderRadius,
  },
});

export const LogLoadingIndicator = styled("div", {
  base: {
    ...utility.row(0),
    height: 52,
    alignItems: "center",
    justifyContent: "space-between",
    padding: `0 ${theme.space[3]}`,
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
    borderTop: `1px solid ${theme.color.divider.base}`,
  },
});

const LogMoreIndicator = styled("div", {
  base: {
    ...utility.row(2),
    alignItems: "center",
    padding: `${theme.space[3]} ${theme.space[3]}`,
    borderTop: `1px solid ${theme.color.divider.base}`,
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

export function Logs() {
  const stage = useStageContext();
  const invocationsContext = useInvocations();
  const bar = useCommandBar();

  const params = useParams();
  const [query, setQuery] = useSearchParams<{
    dummy?: string;
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
        title: "Live",
        category: "logs",
        run: (bar) => {
          setQuery(
            {
              view: "tail",
            },
            { replace: true }
          );
          bar.hide();
        },
        icon: IconBolt,
      },
      {
        title: "Recent",
        category: "logs",
        run: (bar) => {
          setQuery(
            {
              view: "recent",
            },
            { replace: true }
          );
          bar.hide();
        },
        icon: IconClock,
      },
      {
        title: "Open in CloudWatch",
        category: "logs",
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

  const rep = useReplicache();

  const poller = LogPollerStore.list.watch(
    rep,
    () => [],
    (items) => items.find((item) => item.logGroup === logGroup())
  );

  createEffect(() => {
    if (!logGroup()) return;
    if (poller()) return;
    if (mode() !== "tail") return;
    rep().mutate.log_poller_subscribe({
      logGroup: logGroup(),
      stageID: resources()?.at(0)?.stageID!,
    });
  });

  createEffect(() => {
    const r = resource();
    if (!r) return;
    if (mode() === "live") return;
    untrack(() => {
      switchView(query.view || "recent");
    });
  });

  const [search, setSearch] = createStore<{
    id: string;
    start?: Date;
    end?: Date;
  }>({
    id: createId(),
  });
  const activeSearch = LogSearchStore.get.watch(rep, () => [search.id]);

  function createSearch(start?: number, end?: number) {
    setSearch(
      produce((draft) => {
        draft.start = start ? new Date(start) : undefined;
        draft.end = end ? new Date(end) : undefined;
      })
    );

    rep().mutate.log_search({
      id: search.id!,
      stageID: stage.stage.id,
      logGroup: logGroup(),
      timeStart: search.start
        ? DateTime.fromJSDate(search.start!).toSQL({ includeOffset: false })
        : null,
      timeEnd: search.end
        ? DateTime.fromJSDate(search.end!).toSQL({ includeOffset: false })
        : null,
    });
  }

  const logGroupKey = createMemo(() => {
    const base = logGroup();
    const searchID = search.id!;
    const addr = resource()?.addr!;
    if (mode() === "live") return addr;
    if (mode() === "search") return searchID;
    return base + "-tail";
  });

  const invocations = createMemo(() => {
    const result = invocationsContext.forSource(logGroupKey()) || [];
    if (mode() === "tail" || mode() === "live") return result.slice().reverse();
    return result;
  });

  let invokeControl!: InvokeControl;
  let rangeControl!: DialogRangeControl;

  function switchView(val: string) {
    if (val === "custom") {
      setTimeout(() => rangeControl.show(), 0);
      return;
    }
    setQuery(
      {
        view: val,
      },
      {
        replace: true,
      }
    );
    if (val === "tail") return;
    invocationsContext.clear(logGroupKey());
    setSearch("id", createId());
    if (val === "recent") {
      createSearch();
      return;
    }
    if (val === "5min") {
      createSearch(Date.now() - 1000 * 60 * 5, Date.now());
      return;
    }
    if (val === "15min") {
      createSearch(Date.now() - 1000 * 60 * 15, Date.now());
      return;
    }
    if (val === "1hr") {
      createSearch(Date.now() - 1000 * 60 * 60, Date.now());
      return;
    }
    if (val === "6hr") {
      const start = Date.now() - 1000 * 60 * 60 * 6;
      createSearch(start, start + 1000 * 60 * 60);
      return;
    }
    if (val === "12hr") {
      const start = Date.now() - 1000 * 60 * 60 * 12;
      createSearch(start, start + 1000 * 60 * 60);
      return;
    }
    if (val === "24hr") {
      const start = Date.now() - 1000 * 60 * 60 * 24;
      createSearch(start, start + 1000 * 60 * 60);
      return;
    }
  }

  return (
    <>
      <Stack space="5" style={{ padding: `${theme.space[4]}` }}>
        <Row space="2" horizontal="between" vertical="center">
          <Stack space="2" vertical="center">
            <Text size="lg" weight="medium">
              Logs
            </Text>
            <Row
              space="1"
              horizontal="center"
              onClick={() => bar.show("resource")}
            >
              <Text code size="mono_base" color="secondary">
                {resource()?.metadata.handler}
              </Text>
              <LogSwitchIcon>
                <IconChevronUpDown />
              </LogSwitchIcon>
            </Row>
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
                  (mode() === "live" && stage.connected) || mode() === "tail"
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
                    <Show
                      when={search.start && search.end}
                      fallback="Viewing recent logs"
                    >
                      <span>
                        Viewing logs between {search.start?.toLocaleString()} —{" "}
                        {search.end?.toLocaleString()}
                      </span>
                    </Show>
                  </Match>
                  <Match when={true}>Tailing logs&hellip;</Match>
                </Switch>
              </Text>
            </Row>
            <Row space="3.5" vertical="center">
              <Show when={mode() !== "search" && invocations().length > 0}>
                <TextButton
                  onClick={() => {
                    invocationsContext.clear(logGroupKey());
                  }}
                >
                  Clear
                </TextButton>
              </Show>
              <Show when={mode() === "search" && !activeSearch()}>
                <IconButton
                  title="Reload logs"
                  onClick={() => switchView(query.view)}
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
                  <Dropdown.RadioGroup value={query.view} onChange={switchView}>
                    <Dropdown.RadioItem closeOnSelect value="tail">
                      <Dropdown.RadioItemLabel>Live</Dropdown.RadioItemLabel>
                      <Dropdown.ItemIndicator>
                        <IconCheck width={14} height={14} />
                      </Dropdown.ItemIndicator>
                    </Dropdown.RadioItem>
                    <Dropdown.RadioItem closeOnSelect value="recent">
                      <Dropdown.RadioItemLabel>Recent</Dropdown.RadioItemLabel>
                      <Dropdown.ItemIndicator>
                        <IconCheck width={14} height={14} />
                      </Dropdown.ItemIndicator>
                    </Dropdown.RadioItem>
                    <Dropdown.Seperator />
                    <Dropdown.RadioItem closeOnSelect value="5min">
                      <Dropdown.RadioItemLabel>
                        5min ago
                      </Dropdown.RadioItemLabel>
                      <Dropdown.ItemIndicator>
                        <IconCheck width={14} height={14} />
                      </Dropdown.ItemIndicator>
                    </Dropdown.RadioItem>
                    <Dropdown.RadioItem closeOnSelect value="15min">
                      <Dropdown.RadioItemLabel>
                        15min ago
                      </Dropdown.RadioItemLabel>
                      <Dropdown.ItemIndicator>
                        <IconCheck width={14} height={14} />
                      </Dropdown.ItemIndicator>
                    </Dropdown.RadioItem>
                    <Dropdown.RadioItem closeOnSelect value="1hr">
                      <Dropdown.RadioItemLabel>1hr ago</Dropdown.RadioItemLabel>
                      <Dropdown.ItemIndicator>
                        <IconCheck width={14} height={14} />
                      </Dropdown.ItemIndicator>
                    </Dropdown.RadioItem>
                    <Dropdown.RadioItem closeOnSelect value="6hr">
                      <Dropdown.RadioItemLabel>
                        6hrs ago
                      </Dropdown.RadioItemLabel>
                      <Dropdown.ItemIndicator>
                        <IconCheck width={14} height={14} />
                      </Dropdown.ItemIndicator>
                    </Dropdown.RadioItem>
                    <Dropdown.RadioItem closeOnSelect value="12hr">
                      <Dropdown.RadioItemLabel>
                        12hrs ago
                      </Dropdown.RadioItemLabel>
                      <Dropdown.ItemIndicator>
                        <IconCheck width={14} height={14} />
                      </Dropdown.ItemIndicator>
                    </Dropdown.RadioItem>
                    <Dropdown.RadioItem closeOnSelect value="24hr">
                      <Dropdown.RadioItemLabel>
                        1 day ago
                      </Dropdown.RadioItemLabel>
                      <Dropdown.ItemIndicator>
                        <IconCheck width={14} height={14} />
                      </Dropdown.ItemIndicator>
                    </Dropdown.RadioItem>
                    <Dropdown.Seperator />
                    <Dropdown.RadioItem closeOnSelect value="custom">
                      Specify a time&hellip;
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
              onInvoke={() => {
                if (mode() === "search") switchView("tail");
              }}
              control={(c) => (invokeControl = c)}
              resource={resource()!}
            />
          </Show>
          <Show
            when={
              !activeSearch() &&
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
            {(invocation) => (
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
              <Match when={activeSearch()}>
                <LogMoreIndicator>
                  <LogMoreIndicatorIcon>
                    <IconArrowPathSpin />
                  </LogMoreIndicatorIcon>
                  <Text leading="normal" color="dimmed" size="sm">
                    <Show
                      when={query.view === "recent"}
                      fallback={<>Loading&hellip;</>}
                    >
                      Scanning
                      {activeSearch()?.timeStart
                        ? ` from ${formatSinceTime(
                            activeSearch()?.timeStart || ""
                          )}`
                        : ""}
                      &hellip;
                    </Show>
                  </Text>
                </LogMoreIndicator>
              </Match>
              <Match when={query.view === "recent" && invocations().length}>
                <LogMoreIndicator>
                  <LogMoreIndicatorIcon>
                    <IconEllipsisVertical />
                  </LogMoreIndicatorIcon>
                  <TextButton
                    onClick={() => {
                      const i = invocations();
                      createSearch(i[i.length - 1]!.start);
                    }}
                  >
                    Load more logs
                  </TextButton>
                </LogMoreIndicator>
              </Match>
            </Switch>
          </Show>
        </LogList>
      </Stack>
      <DialogRange
        onSelect={(start, end) => {
          setQuery(
            {
              view: "customer",
            },
            {
              replace: true,
            }
          );
          invocationsContext.clear(logGroupKey());
          createSearch(start.getTime(), end.getTime());
        }}
        control={(control) => (rangeControl = control)}
      />
    </>
  );
}

function Context(props: {
  tag?: string;
  type?: Resource.Info["type"];
  extra?: string;
}) {
  const icon = createMemo(() => props.type && ResourceIcon[props.type]);
  return (
    <Row vertical="center" space="3">
      <Show when={props.tag}>
        <Tag style="outline">{props.tag}</Tag>
      </Show>
      <Row vertical="center" space="2">
        <Show when={icon()}>
          {icon()!({
            width: 13,
            height: 13,
          })}
          <Text size="sm" color="secondary" on="base">
            {props.type}
          </Text>
        </Show>
      </Row>
      <Show when={props.extra}>
        <Text size="sm" color="secondary" on="base">
          {props.extra!}
        </Text>
      </Show>
    </Row>
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

const shortDateOptions: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  hour12: true,
  minute: "numeric",
  second: "numeric",
  timeZoneName: "short",
};
const longDateOptions: Intl.DateTimeFormatOptions = {
  ...shortDateOptions,
  timeZone: "UTC",
  year: "numeric",
};

/*
function context() {
  const functions = useFunctionsContext();
  const context = createMemo(() => {
    const parent = functions().get(resource()?.id || "")?.[0];
    if (!parent) return;

    switch (parent.type) {
      case "EventBus":
        return <Context type="EventBus" tag="Subscription" />;
      case "Api": {
        const route = parent.metadata.routes.find(
          (r) => r.fn?.node === resource()?.addr
        );
        if (route) {
          const [method, path] = route.route.split(" ");
          return <Context type="Api" tag={method} extra={path} />;
        }
        break;
      }
      case "ApiGatewayV1Api": {
        const route = parent.metadata.routes.find(
          (r) => r.fn?.node === resource()?.addr
        );
        if (route) {
          const [method, path] = route.route.split(" ");
          return <Context type="Api" tag={method} extra={path} />;
        }
        break;
      }
      case "WebSocketApi": {
        const route = parent.metadata.routes.find(
          (r) => r.fn?.node === resource()?.addr
        );
        if (route) {
          const [method, path] = route.route.split(" ");
          return <Context type="Api" tag={method} extra={path} />;
        }
        break;
      }
      case "Topic": {
        return <Context type="Topic" tag="Subscriber" />;
      }
      case "Bucket": {
        return <Context type="Bucket" tag="Notification" />;
      }
      case "KinesisStream": {
        return <Context type="KinesisStream" tag="Consumer" />;
      }
      case "AppSync": {
        return <Context type="AppSync" tag="Source" />;
      }
      case "Table": {
        return <Context type="Table" tag="Consumer" />;
      }
      case "Cognito": {
        return <Context type="Cognito" tag="Trigger" />;
      }
      case "Cron": {
        return <Context type="Cron" tag="Job" />;
      }
      case "Queue": {
        return <Context type="Queue" tag="Consumer" />;
      }
      case "NextjsSite": {
        return <Context type="NextjsSite" tag="Server" />;
      }
      case "SvelteKitSite": {
        return <Context type="SvelteKitSite" tag="Server" />;
      }
      case "RemixSite": {
        return <Context type="RemixSite" tag="Server" />;
      }
      case "AstroSite": {
        return <Context type="AstroSite" tag="Server" />;
      }
      case "SolidStartSite": {
        return <Context type="SolidStartSite" tag="Server" />;
      }
    }
  });
}
*/
