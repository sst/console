import {
  For,
  JSX,
  Show,
  Match,
  Switch,
  createMemo,
  createSignal,
  createEffect,
  ComponentProps,
  createResource,
} from "solid-js";
import {
  MINIMUM_VERSION,
  useFunctionsContext,
  useOutdated,
  useResourcesContext,
} from "../context";
import { styled } from "@macaron-css/solid";
import { theme } from "$/ui/theme";
import { utility } from "$/ui/utility";
import { Fullscreen, Row, Stack } from "$/ui/layout";
import {
  Tag,
  Text,
  Alert,
  TabTitle,
  SplitOptions,
  SplitOptionsOption,
} from "$/ui";
import {
  IconFunction,
  IconGoRuntime,
  IconJavaRuntime,
  IconNodeRuntime,
  IconRustRuntime,
  IconPythonRuntime,
  IconDotNetRuntime,
  IconContainerRuntime,
} from "$/ui/icons/custom";
import { Resource } from "@console/core/app/resource";
import { Link, Route, Routes } from "@solidjs/router";
import { Syncing } from "$/ui/loader";
import {
  IconCheck,
  IconDocumentDuplicate,
  IconExclamationTriangle,
} from "$/ui/icons";
import {} from "@solid-primitives/keyboard";
import { formatBytes } from "$/common/format";
import { ResourceIcon } from "$/common/resource-icon";

const Content = styled("div", {
  base: {
    padding: theme.space[4],
  },
});

export const PageHeaderRoot = styled("div", {
  base: {
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `0 ${theme.space[4]}`,
    borderBottom: `1px solid ${theme.color.divider.base}`,
  },
});

const Card = styled("div", {
  base: {
    borderRadius: 4,
    backgroundColor: theme.color.background.surface,
  },
  variants: {
    outputs: {
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

const HeaderIcon = styled("div", {
  base: {
    flexShrink: 0,
    width: 18,
    height: 18,
    color: theme.color.icon.secondary,
  },
});

const HeaderDescription = styled("span", {
  base: {
    ...utility.text.line,
    maxWidth: 500,
    lineHeight: "normal",
    color: theme.color.text.dimmed.surface,
  },
});

const HeaderDescriptionLink = styled("a", {
  base: {
    color: theme.color.text.dimmed.surface,
    ":hover": {
      color: theme.color.text.dimmed.surface,
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
    outputs: {
      true: {
        borderColor: theme.color.divider.base,
      },
    },
  },
});

export const Child = styled("div", {
  base: {
    padding: `${theme.space[4]} 0`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space[4],
    borderBottom: `1px solid ${theme.color.divider.surface}`,
    selectors: {
      "&:last-child": {
        border: "none",
      },
    },
  },
  variants: {
    outputs: {
      true: {
        borderColor: theme.color.divider.base,
      },
    },
  },
});

export const ChildTitleLink = styled(Link, {
  base: {
    ...utility.text.line,
    lineHeight: "normal",
    fontFamily: theme.font.family.code,
  },
});

export const ChildTitle = styled("span", {
  base: {
    ...utility.text.line,
  },
});

export const ChildDetail = styled("div", {
  base: {
    ...utility.text.line,
    display: "flex",
    alignItems: "baseline",
    color: theme.color.text.secondary.surface,
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_base,
    textAlign: "right",
    lineHeight: "normal",
  },
});

export const ChildDetailUnit = styled("span", {
  base: {
    padding: 3,
    fontSize: theme.font.size.xs,
  },
});

export const ChildIcon = styled("div", {
  base: {
    flexShrink: 0,
    height: 16,
    width: 16,
    color: theme.color.icon.dimmed,
  },
});

export const ChildIconButton = styled("button", {
  base: {
    flexShrink: 0,
    height: 16,
    width: 16,
    color: theme.color.icon.dimmed,
    ":hover": {
      color: theme.color.icon.secondary,
    },
  },
  variants: {
    copying: {
      true: {
        cursor: "default",
        color: theme.color.accent,
        ":hover": {
          color: theme.color.accent,
        },
      },
    },
  },
});

const OutputsValue = styled("span", {
  base: {
    ...utility.text.line,
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_base,
    color: theme.color.text.dimmed.base,
    lineHeight: "normal",
  },
});

const OutputsKey = styled("span", {
  base: {
    ...utility.text.line,
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_base,
    lineHeight: "normal",
    minWidth: "33%",
  },
});

function cleanFilepath(path: string) {
  if (!path) return;
  return path.replace(/^\.?\//, "");
}

function getUrl(url?: string, customDomainUrl?: string) {
  return customDomainUrl ? customDomainUrl : url ? url : undefined;
}

function resourcePriority(resource: Resource.Info) {
  switch (resource.type) {
    case "RemixSite":
    case "AstroSite":
    case "NextjsSite":
    case "SvelteKitSite":
    case "SolidStartSite":
      return 1;
    case "Api":
    case "AppSync":
    case "ApiGatewayV1Api":
      return 2;
    case "WebSocketApi":
      return 3;
    case "StaticSite":
      return 4;
    case "Bucket":
      return 5;
    case "RDS":
    case "Table":
      return 6;
    case "Cron":
      return 8;
    case "EventBus":
      return 8;
    case "Queue":
    case "Topic":
    case "KinesisStream":
      return 9;
    case "Cognito":
      return 10;
    case "Script":
      return 11;
    default:
      return 100;
  }
}

function sortResources(resources: Resource.Info[]): Resource.Info[] {
  const displayResources = resources.filter(
    (r) =>
      r.type === "Api" ||
      r.type === "RDS" ||
      r.type === "Cron" ||
      r.type === "Table" ||
      r.type === "Queue" ||
      r.type === "Topic" ||
      r.type === "Bucket" ||
      r.type === "Script" ||
      r.type === "Cognito" ||
      r.type === "AppSync" ||
      r.type === "EventBus" ||
      r.type === "AstroSite" ||
      r.type === "RemixSite" ||
      r.type === "StaticSite" ||
      r.type === "NextjsSite" ||
      r.type === "WebSocketApi" ||
      r.type === "KinesisStream" ||
      r.type === "SvelteKitSite" ||
      r.type === "SolidStartSite" ||
      r.type === "ApiGatewayV1Api"
  );

  return displayResources.sort((a, b) => {
    const priority = resourcePriority(a) - resourcePriority(b);
    return priority === 0
      ? a.type === b.type
        ? a.cfnID > b.cfnID
          ? 1
          : -1
        : a.type > b.type
        ? 1
        : -1
      : priority;
  });
}

type PageHeaderProps = ComponentProps<typeof PageHeaderRoot> & {
  right?: JSX.Element;
};

export function PageHeader(props: PageHeaderProps) {
  return (
    <PageHeaderRoot {...props}>
      <Row space="5" vertical="center">
        {props.children}
      </Row>
      {props.right}
    </PageHeaderRoot>
  );
}

interface HeaderProps {
  resource: Resource.Info;
  icon?: (props: any) => JSX.Element;
  link?: string;
  description?: string;
}

export function Header(props: HeaderProps) {
  const icon = createMemo(
    () =>
      props.icon ||
      ResourceIcon[props.resource.type as keyof typeof ResourceIcon]
  );
  return (
    <HeaderRoot>
      <Row space="2" vertical="center">
        <Row space="2" vertical="center">
          <Show when={icon}>
            {(icon) => (
              <HeaderIcon title={props.resource.type}>
                {icon()()({})}
              </HeaderIcon>
            )}
          </Show>
          <Text on="surface" weight="medium" style={{ "flex-shrink": "0" }}>
            {props.resource.type}
          </Text>
        </Row>
        <Text code color="secondary" size="mono_base" on="surface">
          {props.resource.cfnID}
        </Text>
      </Row>
      <HeaderDescription>
        <Show when={props.link} fallback={props.description}>
          <HeaderDescriptionLink
            target="_blank"
            href={props.link}
            rel="noopener noreferrer"
          >
            {props.description}
          </HeaderDescriptionLink>
        </Show>
      </HeaderDescription>
    </HeaderRoot>
  );
}

export function Resources() {
  const resources = useResourcesContext();
  const stacks = createMemo(() =>
    resources().filter((r) => r.type === "Stack")
  );
  const outdated = useOutdated();
  const sortedResources = createMemo(() => sortResources([...resources()]));

  return (
    <Switch>
      <Match when={!resources().length}>
        <Fullscreen>
          <Syncing>Waiting for resources&hellip;</Syncing>
        </Fullscreen>
      </Match>
      <Match when={true}>
        <Show when={false}>
          <PageHeaderRoot>
            <Row space="5" vertical="center">
              <TabTitle state="active">Resources</TabTitle>
              <Link href="issues">
                <TabTitle count="99+" state="inactive">
                  Issues
                </TabTitle>
              </Link>
            </Row>
            <Routes>
              <Route
                path="issues/*"
                element={
                  <SplitOptions size="sm">
                    <SplitOptionsOption selected>Active</SplitOptionsOption>
                    <SplitOptionsOption>Ignored</SplitOptionsOption>
                    <SplitOptionsOption>Resolved</SplitOptionsOption>
                  </SplitOptions>
                }
              />
            </Routes>
          </PageHeaderRoot>
        </Show>
        <Content>
          <Stack space="4">
            <Show when={outdated().length}>
              <Alert level="info">
                <span
                  title={outdated()
                    .map((s) => s.stackID)
                    .join(", ")}
                >
                  Some of the stacks in this app are not supported by the SST
                  Console.
                </span>{" "}
                <a target="_blank" href="https://github.com/sst/sst/releases">
                  Upgrade them to at least v{MINIMUM_VERSION}.
                </a>
              </Alert>
            </Show>
            <For each={sortedResources()}>
              {(resource) => (
                <Card>
                  <Switch>
                    <Match when={resource.type === "Api" && resource}>
                      {(resource) => <ApiCard resource={resource()} />}
                    </Match>
                    <Match
                      when={resource.type === "ApiGatewayV1Api" && resource}
                    >
                      {(resource) => (
                        <ApiGatewayV1ApiCard resource={resource()} />
                      )}
                    </Match>
                    <Match when={resource.type === "AppSync" && resource}>
                      {(resource) => <AppSyncCard resource={resource()} />}
                    </Match>
                    <Match when={resource.type === "WebSocketApi" && resource}>
                      {(resource) => <WebSocketApiCard resource={resource()} />}
                    </Match>
                    <Match when={resource.type === "NextjsSite" && resource}>
                      {(resource) => <NextjsSiteCard resource={resource()} />}
                    </Match>
                    <Match when={resource.type === "SvelteKitSite" && resource}>
                      {(resource) => (
                        <SvelteKitSiteCard resource={resource()} />
                      )}
                    </Match>
                    <Match when={resource.type === "AstroSite" && resource}>
                      {(resource) => <AstroSiteCard resource={resource()} />}
                    </Match>
                    <Match when={resource.type === "RemixSite" && resource}>
                      {(resource) => <RemixSiteCard resource={resource()} />}
                    </Match>
                    <Match
                      when={resource.type === "SolidStartSite" && resource}
                    >
                      {(resource) => (
                        <SolidStartSiteCard resource={resource()} />
                      )}
                    </Match>
                    <Match when={resource.type === "StaticSite" && resource}>
                      {(resource) => <StaticSiteCard resource={resource()} />}
                    </Match>
                    <Match when={resource.type === "Table" && resource}>
                      {(resource) => <TableCard resource={resource()} />}
                    </Match>
                    <Match when={resource.type === "RDS" && resource}>
                      {(resource) => <RDSCard resource={resource()} />}
                    </Match>
                    <Match when={resource.type === "EventBus" && resource}>
                      {(resource) => <EventBusCard resource={resource()} />}
                    </Match>
                    <Match when={resource.type === "Topic" && resource}>
                      {(resource) => <TopicCard resource={resource()} />}
                    </Match>
                    <Match when={resource.type === "KinesisStream" && resource}>
                      {(resource) => (
                        <KinesisStreamCard resource={resource()} />
                      )}
                    </Match>
                    <Match when={resource.type === "Queue" && resource}>
                      {(resource) => <QueueCard resource={resource()} />}
                    </Match>
                    <Match when={resource.type === "Bucket" && resource}>
                      {(resource) => <BucketCard resource={resource()} />}
                    </Match>
                    <Match when={resource.type === "Cognito" && resource}>
                      {(resource) => <CognitoCard resource={resource()} />}
                    </Match>
                    <Match when={resource.type === "Cron" && resource}>
                      {(resource) => <CronCard resource={resource()} />}
                    </Match>
                    <Match when={resource.type === "Script" && resource}>
                      {(resource) => <ScriptCard resource={resource()} />}
                    </Match>
                  </Switch>
                </Card>
              )}
            </For>
            <OrphanFunctionsCard />
            <OutputsCard />
          </Stack>
        </Content>
      </Match>
    </Switch>
  );
}
function formatPath(path?: string) {
  return path ? (path === "." ? `"${path}"` : path) : `""`;
}

interface CardProps<Type extends Resource.Info["type"]> {
  resource: Extract<Resource.Info, { type: Type }>;
}

export function ApiCard(props: CardProps<"Api">) {
  return (
    <>
      <Header
        resource={props.resource}
        link={getUrl(
          props.resource.metadata.url,
          props.resource.metadata.customDomainUrl
        )}
        description={
          props.resource.metadata.customDomainUrl ||
          props.resource.metadata.url ||
          ""
        }
      />
      {props.resource.metadata.routes.length > 0 && (
        <Children>
          <For each={props.resource.metadata.routes}>
            {(route) => {
              const method = createMemo(() => route.route.split(" ")[0]);
              const path = createMemo(() => route.route.split(" ")[1]);
              return (
                <FunctionChild
                  tag={method()}
                  title={path()}
                  tagSize="small"
                  id={route.fn?.node}
                />
              );
            }}
          </For>
        </Children>
      )}
    </>
  );
}

export function WebSocketApiCard(props: CardProps<"WebSocketApi">) {
  return (
    <>
      <Header
        resource={props.resource}
        description={
          props.resource.metadata.customDomainUrl || props.resource.metadata.url
        }
      />
      <Children>
        <For each={props.resource.metadata.routes}>
          {(route) => {
            const method = createMemo(() => route.route.slice(1));
            const path = createMemo(() => route.route.split(" ")[1]);
            return (
              <FunctionChild
                tag={method()}
                title={path()}
                tagSize="large"
                id={route.fn?.node}
              />
            );
          }}
        </For>
      </Children>
    </>
  );
}

export function ApiGatewayV1ApiCard(props: CardProps<"ApiGatewayV1Api">) {
  return (
    <>
      <Header
        resource={props.resource}
        link={getUrl(
          props.resource.metadata.url,
          props.resource.metadata.customDomainUrl
        )}
        description={
          props.resource.metadata.customDomainUrl ||
          props.resource.metadata.url ||
          ""
        }
      />
      <Children>
        <For each={props.resource.metadata.routes}>
          {(route) => {
            const method = createMemo(() => route.route.split(" ")[0]);
            const path = createMemo(() => route.route.split(" ")[1]);
            return (
              <FunctionChild
                tag={method()}
                title={path()}
                tagSize="small"
                id={route.fn?.node}
              />
            );
          }}
        </For>
      </Children>
    </>
  );
}

export function EventBusCard(props: CardProps<"EventBus">) {
  return (
    <>
      <Header resource={props.resource} />
      <Children>
        <For each={props.resource.metadata.rules}>
          {(rule) => (
            <For each={rule.targets}>
              {(target) => (
                <FunctionChild id={target?.node} tag="Subscription" />
              )}
            </For>
          )}
        </For>
      </Children>
    </>
  );
}

export function TopicCard(props: CardProps<"Topic">) {
  return (
    <>
      <Header resource={props.resource} />
      <Children>
        <For each={props.resource.metadata.subscribers}>
          {(sub) => <FunctionChild id={sub?.node} tag="Subscriber" />}
        </For>
      </Children>
    </>
  );
}
export function BucketCard(props: CardProps<"Bucket">) {
  return (
    <>
      <Header resource={props.resource} />
      {props.resource.metadata.notifications.length > 0 && (
        <Children>
          <For each={props.resource.metadata.notifications}>
            {(notification) => (
              <FunctionChild id={notification?.node} tag="Notification" />
            )}
          </For>
        </Children>
      )}
    </>
  );
}

export function KinesisStreamCard(props: CardProps<"KinesisStream">) {
  return (
    <>
      <Header resource={props.resource} />
      <Children>
        <For each={props.resource.metadata.consumers}>
          {(consumer) => (
            <FunctionChild id={consumer.fn?.node} tag="Consumer" />
          )}
        </For>
      </Children>
    </>
  );
}

export function AppSyncCard(props: CardProps<"AppSync">) {
  return (
    <>
      <Header
        resource={props.resource}
        link={getUrl(
          props.resource.metadata.url,
          props.resource.metadata.customDomainUrl
        )}
        description={
          props.resource.metadata.customDomainUrl || props.resource.metadata.url
        }
      />
      <Children>
        <For each={props.resource.metadata.dataSources}>
          {(source) => <FunctionChild id={source.fn?.node} tag="Source" />}
        </For>
      </Children>
    </>
  );
}

export function TableCard(props: CardProps<"Table">) {
  return (
    <>
      <Header resource={props.resource} />
      <Children>
        <For each={props.resource.metadata.consumers}>
          {(consumer) => (
            <FunctionChild id={consumer.fn?.node} tag="Consumer" />
          )}
        </For>
      </Children>
    </>
  );
}

export function ScriptCard(props: CardProps<"Script">) {
  return (
    <>
      <Header resource={props.resource} />
      <Children>
        <FunctionChild
          id={props.resource.metadata.createfn?.node}
          tag="Create"
        />
        <FunctionChild
          id={props.resource.metadata.deletefn?.node}
          tag="Delete"
        />
        <FunctionChild
          id={props.resource.metadata.updatefn?.node}
          tag="Update"
        />
      </Children>
    </>
  );
}

export function CognitoCard(props: CardProps<"Cognito">) {
  return (
    <>
      <Header resource={props.resource} />
      <Children>
        <For each={props.resource.metadata.triggers}>
          {(trigger) => <FunctionChild id={trigger.fn?.node} tag="Trigger" />}
        </For>
      </Children>
    </>
  );
}

export function CronCard(props: CardProps<"Cron">) {
  return (
    <>
      <Header
        resource={props.resource}
        description={props.resource.metadata.schedule}
      />
      <Children>
        <FunctionChild id={props.resource.metadata.job?.node} tag="Job" />
      </Children>
    </>
  );
}

export function QueueCard(props: CardProps<"Queue">) {
  return (
    <>
      <Header resource={props.resource} />
      <Children>
        <FunctionChild
          id={props.resource.metadata.consumer?.node}
          tag="Consumer"
        />
      </Children>
    </>
  );
}

export function StaticSiteCard(props: CardProps<"StaticSite">) {
  return (
    <>
      <Header
        resource={props.resource}
        link={getUrl(
          props.resource.metadata.url,
          props.resource.metadata.customDomainUrl
        )}
        description={
          props.resource.metadata.customDomainUrl ||
          props.resource.metadata.url ||
          cleanFilepath(props.resource.metadata.path)
        }
      />
    </>
  );
}

export function NextjsSiteCard(props: CardProps<"NextjsSite">) {
  return (
    <>
      <Header
        resource={props.resource}
        link={getUrl(
          props.resource.metadata.url,
          props.resource.metadata.customDomainUrl
        )}
        description={
          props.resource.metadata.customDomainUrl ||
          props.resource.metadata.url ||
          cleanFilepath(props.resource.metadata.path)
        }
      />
      <Show when={props.resource.metadata.mode === "deployed"}>
        <Children>
          <For
            each={props.resource.metadata.routes?.data || []}
            fallback={
              <FunctionChild id={props.resource.metadata.server} tag="Server" />
            }
          >
            {(item) => {
              return (
                <FunctionChild
                  logGroup={
                    props.resource.metadata.routes?.logGroupPrefix +
                    item.logGroupPath
                  }
                  title={item.route}
                  tagSize="small"
                  id={props.resource.metadata.server}
                />
              );
            }}
          </For>
        </Children>
      </Show>
    </>
  );
}

export function SvelteKitSiteCard(props: CardProps<"SvelteKitSite">) {
  return (
    <>
      <Header
        resource={props.resource}
        link={getUrl(
          props.resource.metadata.url,
          props.resource.metadata.customDomainUrl
        )}
        description={
          props.resource.metadata.customDomainUrl ||
          props.resource.metadata.url ||
          cleanFilepath(props.resource.metadata.path)
        }
      />
      <Show when={props.resource.metadata.mode === "deployed"}>
        <Children>
          <FunctionChild id={props.resource.metadata.server} tag="Server" />
        </Children>
      </Show>
    </>
  );
}

export function RemixSiteCard(props: CardProps<"RemixSite">) {
  return (
    <>
      <Header
        resource={props.resource}
        link={getUrl(
          props.resource.metadata.url,
          props.resource.metadata.customDomainUrl
        )}
        description={
          props.resource.metadata.customDomainUrl ||
          props.resource.metadata.url ||
          cleanFilepath(props.resource.metadata.path)
        }
      />
      <Show when={props.resource.metadata.mode === "deployed"}>
        <Children>
          <FunctionChild id={props.resource.metadata.server} tag="Server" />
        </Children>
      </Show>
    </>
  );
}

export function AstroSiteCard(props: CardProps<"AstroSite">) {
  return (
    <>
      <Header
        resource={props.resource}
        link={getUrl(
          props.resource.metadata.url,
          props.resource.metadata.customDomainUrl
        )}
        description={
          props.resource.metadata.customDomainUrl ||
          props.resource.metadata.url ||
          cleanFilepath(props.resource.metadata.path)
        }
      />
      <Show when={props.resource.metadata.mode === "deployed"}>
        <Children>
          <FunctionChild id={props.resource.metadata.server} tag="Server" />
        </Children>
      </Show>
    </>
  );
}

export function SolidStartSiteCard(props: CardProps<"SolidStartSite">) {
  return (
    <>
      <Header
        resource={props.resource}
        link={getUrl(
          props.resource.metadata.url,
          props.resource.metadata.customDomainUrl
        )}
        description={
          props.resource.metadata.customDomainUrl ||
          props.resource.metadata.url ||
          cleanFilepath(props.resource.metadata.path)
        }
      />
      <Show when={props.resource.metadata.mode === "deployed"}>
        <Children>
          <FunctionChild id={props.resource.metadata.server} tag="Server" />
        </Children>
      </Show>
    </>
  );
}

export function OutputsCard() {
  const resources = useResourcesContext();
  const outputs = createMemo(() =>
    resources()
      .flatMap((r) => (r.type === "Stack" ? r.enrichment.outputs : []))
      .sort((a, b) => a.OutputKey!.localeCompare(b.OutputKey!))
  );

  return (
    <Show when={outputs().length}>
      <Card outputs>
        <HeaderRoot>
          <Text weight="medium" style={{ "flex-shrink": "0" }}>
            Outputs
          </Text>
        </HeaderRoot>
        <Children outputs>
          <For each={outputs()}>
            {(output) => {
              const [copying, setCopying] = createSignal(false);
              return (
                <Show
                  when={
                    output?.OutputValue && output.OutputValue?.trim() !== ""
                  }
                >
                  <Child outputs>
                    <OutputsKey>{output.OutputKey}</OutputsKey>
                    <Row space="3" vertical="center">
                      <OutputsValue>{output.OutputValue}</OutputsValue>
                      <ChildIconButton
                        copying={copying()}
                        onClick={() => {
                          setCopying(true);
                          navigator.clipboard.writeText(output.OutputValue!);
                          setTimeout(() => setCopying(false), 2000);
                        }}
                      >
                        <Show when={!copying()} fallback={<IconCheck />}>
                          <IconDocumentDuplicate />
                        </Show>
                      </ChildIconButton>
                    </Row>
                  </Child>
                </Show>
              );
            }}
          </For>
        </Children>
      </Card>
    </Show>
  );
}

export function OrphanFunctionsCard() {
  const functions = useFunctionsContext();
  const orphans = createMemo(() =>
    [...functions().entries()]
      .filter(([_, values]) => !values.length)
      .map(([key]) => key)
  );

  return (
    <Show when={orphans().length}>
      <Card>
        <HeaderRoot>
          <Row space="2" vertical="center">
            <HeaderIcon title="Functions">
              <IconFunction />
            </HeaderIcon>
            <Text weight="medium" on="surface" style={{ "flex-shrink": "0" }}>
              Other Functions
            </Text>
          </Row>
        </HeaderRoot>
        <Children>
          <For each={orphans()}>
            {(orphan) => <FunctionChild id={orphan} />}
          </For>
        </Children>
      </Card>
    </Show>
  );
}

export function RDSCard(props: CardProps<"RDS">) {
  return (
    <>
      <Header
        resource={props.resource}
        description={props.resource.metadata.defaultDatabaseName}
      />
    </>
  );
}

function FunctionChild(props: {
  id: string | undefined;
  tag?: string;
  title?: string;
  logGroup?: string;
  tagSize?: ComponentProps<typeof Tag>["size"];
}) {
  const resources = useResourcesContext();
  const fn = createMemo(
    () =>
      resources().find(
        (r) =>
          r.type === "Function" &&
          (r.id === props.id ||
            r.addr === props.id ||
            r.metadata.arn === props.id)
      ) as Extract<Resource.Info, { type: "Function" }> | undefined
  );
  const runtime = createMemo(
    () => fn()?.metadata.runtime || fn()?.enrichment.runtime || ""
  );
  return (
    <Show when={fn()}>
      {(exists) => (
        <Child>
          <Row space="3" vertical="center">
            <Show when={props.tag}>
              <Tag style="outline" size={props.tagSize}>
                {props.tag!}
              </Tag>
            </Show>
            <ChildTitleLink
              href={`./logs/${exists().id}?logGroup=${props.logGroup || ""}`}
            >
              <Show
                when={props.title}
                fallback={
                  new URL("https://example.com/" + exists().metadata.handler)
                    .pathname
                }
              >
                {formatPath(props.title)}
              </Show>
            </ChildTitleLink>
          </Row>
          <Row flex={false} space="3" vertical="center">
            <Show when={exists().enrichment.size}>
              {(value) => {
                const formattedSize = formatBytes(value());
                return (
                  <ChildDetail>
                    {formattedSize.value}
                    <ChildDetailUnit>{formattedSize.unit}</ChildDetailUnit>
                  </ChildDetail>
                );
              }}
            </Show>
            <ChildIcon title={runtime()}>
              <Switch>
                <Match when={runtime().startsWith("dotnet")}>
                  <IconDotNetRuntime />
                </Match>
                <Match when={runtime().startsWith("dotnet")}>
                  <IconDotNetRuntime />
                </Match>
                <Match when={runtime().startsWith("python")}>
                  <IconPythonRuntime />
                </Match>
                <Match when={runtime().startsWith("java")}>
                  <IconJavaRuntime />
                </Match>
                <Match when={runtime().startsWith("go")}>
                  <IconGoRuntime />
                </Match>
                <Match when={runtime().startsWith("nodejs")}>
                  <IconNodeRuntime />
                </Match>
                <Match when={runtime().startsWith("rust")}>
                  <IconRustRuntime />
                </Match>
                <Match when={runtime().startsWith("container")}>
                  <IconContainerRuntime />
                </Match>
                <Match when={true}>
                  <IconFunction />
                </Match>
              </Switch>
            </ChildIcon>
          </Row>
        </Child>
      )}
    </Show>
  );
}
