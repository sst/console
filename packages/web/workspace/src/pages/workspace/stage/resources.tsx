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
} from "solid-js";
import { useFunctionsContext, useResourcesContext } from "./context";
import { styled } from "@macaron-css/solid";
import { theme } from "$/ui/theme";
import { utility } from "$/ui/utility";
import { Fullscreen, Row, Stack } from "$/ui/layout";
import { Tag, Text, Alert } from "$/ui";
import {
  IconApi,
  IconRDS,
  IconJob,
  IconAuth,
  IconCron,
  IconTopic,
  IconStack,
  IconTable,
  IconQueue,
  IconScript,
  IconBucket,
  IconAppSync,
  IconCognito,
  IconFunction,
  IconEventBus,
  IconAstroSite,
  IconRemixSite,
  IconStaticSite,
  IconNextjsSite,
  IconNodeRuntime,
  IconWebSocketApi,
  IconSvelteKitSite,
  IconKinesisStream,
  IconSolidStartSite,
  IconApiGatewayV1Api,
} from "$/ui/icons/custom";
import { Resource } from "@console/core/app/resource";
import { Link } from "@solidjs/router";
import { Syncing } from "$/ui/loader";
import {
  IconCheck,
  IconDocumentDuplicate,
  IconExclamationTriangle,
} from "$/ui/icons";
import {} from "@solid-primitives/keyboard";

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
    width: 14,
    height: 14,
    color: theme.color.icon.secondary,
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
    ...utility.textLine(),
    lineHeight: "normal",
    fontFamily: theme.font.family.code,
  },
});

export const ChildTitle = styled("span", {
  base: {
    ...utility.textLine(),
  },
});

export const ChildDetail = styled("div", {
  base: {
    ...utility.textLine(),
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
    fontWeight: 500,
    paddingLeft: 3,
    fontSize: theme.font.size.xs,
  },
});

export const ChildIcon = styled("div", {
  base: {
    flexShrink: 0,
    height: 16,
    width: 16,
    color: theme.color.icon.dimmed,
    transition: `color ${theme.colorFadeDuration} ease-out`,
  },
});

export const ChildIconButton = styled(ChildIcon, {
  base: {
    ":hover": {
      color: theme.color.icon.secondary,
    },
  },
  variants: {
    copying: {
      true: {
        color: theme.color.accent,
        ":hover": {
          color: theme.color.accent,
        },
      },
    },
  },
});

function cleanFilepath(path: string) {
  return path.replace(/^\.?\//, "");
}

interface HeaderProps {
  resource: Resource.Info;
  icon?: (props: any) => JSX.Element;
  description?: string;
}

export function Header(props: HeaderProps) {
  const icon = createMemo(() => props.icon || IconMap[props.resource.type]);
  return (
    <HeaderRoot>
      <Row space="2" vertical="center">
        <Row space="1.5" vertical="center">
          <Show when={icon}>
            {(icon) => (
              <HeaderIcon title={props.resource.type}>
                {icon()()({})}
              </HeaderIcon>
            )}
          </Show>
          <Text on="surface" weight="medium" style={{ "flex-shrink": "0" }}>
            {props.resource.cfnID}
          </Text>
        </Row>
        <Text
          line
          on="surface"
          color="dimmed"
          leading="normal"
          style={{ "max-width": "500px" }}
        >
          {props.description}
        </Text>
      </Row>
      <Text code color="secondary" size="mono_base" on="surface">
        {props.resource.type}
      </Text>
    </HeaderRoot>
  );
}

const MINIMUM_VERSION = "2.19.2";
export function Resources() {
  const resources = useResourcesContext();
  const stacks = createMemo(() =>
    resources().filter((r) => r.type === "Stack")
  );
  const outdated = createMemo(() =>
    stacks().filter(
      (r) =>
        r.type === "Stack" &&
        r.enrichment.version &&
        r.enrichment.version < MINIMUM_VERSION &&
        !r.enrichment.version?.startsWith("0.0.0")
    )
  );
  const minVersion = createMemo(
    () =>
      outdated()
        .map((r) => r.type === "Stack" && r.enrichment.version)
        .sort()[0]
  );

  createEffect(() => {
    console.log(outdated().length, stacks().length);
  });
  return (
    <Switch>
      <Match when={!resources().length}>
        <Fullscreen>
          <Syncing>Waiting for resources</Syncing>
        </Fullscreen>
      </Match>
      <Match when={stacks().length === outdated().length}>
        <Fullscreen>
          <UnsupportedAppRoot>
            <Stack horizontal="center" space="5">
              <UnsupportedAppIcon>
                <IconExclamationTriangle />
              </UnsupportedAppIcon>
              <Stack horizontal="center" space="2">
                <Text line size="lg" weight="medium">
                  Unsupported SST version
                  {minVersion() ? " v" + minVersion() : ""}
                </Text>
                <Text center size="sm" color="secondary">
                  To use the SST Console,{" "}
                  <a
                    target="_blank"
                    href="https://github.com/serverless-stack/sst/releases"
                  >
                    upgrade to v{MINIMUM_VERSION}
                  </a>
                </Text>
              </Stack>
            </Stack>
          </UnsupportedAppRoot>
        </Fullscreen>
      </Match>
      <Match when={true}>
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
            <a
              target="_blank"
              href="https://github.com/serverless-stack/sst/releases"
            >
              Upgrade them to at least v{MINIMUM_VERSION}.
            </a>
          </Alert>
        </Show>
        <For
          each={resources()
            .filter(
              (r) =>
                r.type === "Api" ||
                r.type === "RDS" ||
                r.type === "Cron" ||
                r.type === "Table" ||
                r.type === "Queue" ||
                r.type === "Topic" ||
                r.type === "Bucket" ||
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
            )
            .sort((a, b) => (a.cfnID > b.cfnID ? 1 : -1))}
        >
          {(resource) => (
            <Card>
              <Switch>
                <Match when={resource.type === "Api" && resource}>
                  {(resource) => <ApiCard resource={resource()} />}
                </Match>
                <Match when={resource.type === "ApiGatewayV1Api" && resource}>
                  {(resource) => <ApiGatewayV1ApiCard resource={resource()} />}
                </Match>
                <Match when={resource.type === "AppSync" && resource}>
                  {(resource) => <AppSyncCard resource={resource()} />}
                </Match>
                <Match when={resource.type === "WebSocketApi" && resource}>
                  {(resource) => <WebSocketApiCard resource={resource()} />}
                </Match>
                <Match when={resource.type === "EventBus" && resource}>
                  {(resource) => <EventBusCard resource={resource()} />}
                </Match>
                <Match when={resource.type === "NextjsSite" && resource}>
                  {(resource) => <NextjsSiteCard resource={resource()} />}
                </Match>
                <Match when={resource.type === "SvelteKitSite" && resource}>
                  {(resource) => <SvelteKitSiteCard resource={resource()} />}
                </Match>
                <Match when={resource.type === "AstroSite" && resource}>
                  {(resource) => <AstroSiteCard resource={resource()} />}
                </Match>
                <Match when={resource.type === "RemixSite" && resource}>
                  {(resource) => <RemixSiteCard resource={resource()} />}
                </Match>
                <Match when={resource.type === "SolidStartSite" && resource}>
                  {(resource) => <SolidStartSiteCard resource={resource()} />}
                </Match>
                <Match when={resource.type === "StaticSite" && resource}>
                  {(resource) => <StaticSiteCard resource={resource()} />}
                </Match>
                <Match when={resource.type === "RDS" && resource}>
                  {(resource) => <RDSCard resource={resource()} />}
                </Match>
                <Match when={resource.type === "Topic" && resource}>
                  {(resource) => <TopicCard resource={resource()} />}
                </Match>
                <Match when={resource.type === "KinesisStream" && resource}>
                  {(resource) => <KinesisStreamCard resource={resource()} />}
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
                <Match when={resource.type === "Table" && resource}>
                  {(resource) => <TableCard resource={resource()} />}
                </Match>
              </Switch>
            </Card>
          )}
        </For>
        <OrphanFunctionsCard />
        <OutputsCard />
      </Match>
    </Switch>
  );
}

const UnsupportedAppRoot = styled("div", {
  base: {
    ...utility.stack(8),
    alignItems: "center",
    width: 320,
  },
});

const UnsupportedAppIcon = styled("div", {
  base: {
    width: 42,
    height: 42,
    color: theme.color.icon.dimmed,
  },
});

function formatPath(path?: string) {
  return path ? (path === "." ? `"${path}"` : path) : `""`;
}

interface CardProps<Type extends Resource.Info["type"]> {
  resource: Extract<Resource.Info, { type: Type }>;
}

export const IconMap = {
  Api: IconApi,
  Job: IconJob,
  RDS: IconRDS,
  Auth: IconAuth,
  Cron: IconCron,
  Queue: IconQueue,
  Stack: IconStack,
  Table: IconTable,
  Topic: IconTopic,
  Bucket: IconBucket,
  Script: IconScript,
  AppSync: IconAppSync,
  Cognito: IconCognito,
  EventBus: IconEventBus,
  Function: IconFunction,
  AstroSite: IconAstroSite,
  RemixSite: IconRemixSite,
  NextjsSite: IconNextjsSite,
  StaticSite: IconStaticSite,
  SlsNextjsSite: IconNextjsSite,
  WebSocketApi: IconWebSocketApi,
  KinesisStream: IconKinesisStream,
  SvelteKitSite: IconSvelteKitSite,
  SolidStartSite: IconSolidStartSite,
  ApiGatewayV1Api: IconApiGatewayV1Api,
} satisfies Record<Resource.Info["type"], (props: any) => JSX.Element>;

export function ApiCard(props: CardProps<"Api">) {
  return (
    <>
      <Header
        resource={props.resource}
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
        description={
          props.resource.metadata.customDomainUrl ||
          props.resource.metadata.url ||
          cleanFilepath(props.resource.metadata.path)
        }
      />
      <Children>
        <Child>
          <Row space="3" vertical="center">
            <Tag style="outline">Server</Tag>
            <ChildTitleLink href={`./logs/`}>
              {formatPath(props.resource.metadata.path)}
            </ChildTitleLink>
          </Row>
          <Row shrink={false} space="3" vertical="center">
            <ChildIcon>
              <IconNodeRuntime />
            </ChildIcon>
          </Row>
        </Child>
      </Children>
    </>
  );
}

export function SvelteKitSiteCard(props: CardProps<"SvelteKitSite">) {
  return (
    <>
      <Header
        resource={props.resource}
        description={
          props.resource.metadata.customDomainUrl ||
          props.resource.metadata.url ||
          cleanFilepath(props.resource.metadata.path)
        }
      />
      <Children>
        <FunctionChild id={props.resource.metadata.server} tag="Server" />
      </Children>
    </>
  );
}

export function RemixSiteCard(props: CardProps<"RemixSite">) {
  return (
    <>
      <Header
        resource={props.resource}
        description={
          props.resource.metadata.customDomainUrl ||
          props.resource.metadata.url ||
          cleanFilepath(props.resource.metadata.path)
        }
      />
      <Children>
        <FunctionChild id={props.resource.metadata.server} tag="Server" />
      </Children>
    </>
  );
}

export function AstroSiteCard(props: CardProps<"AstroSite">) {
  return (
    <>
      <Header
        resource={props.resource}
        description={
          props.resource.metadata.customDomainUrl ||
          props.resource.metadata.url ||
          cleanFilepath(props.resource.metadata.path)
        }
      />
      <Children>
        <FunctionChild id={props.resource.metadata.server} tag="Server" />
        <Child>
          <Row space="3" vertical="center">
            <Tag style="outline">Server</Tag>
            <ChildTitleLink href={`./logs/${props.resource.metadata.server}`}>
              {formatPath(props.resource.metadata.path)}
            </ChildTitleLink>
          </Row>
          <Row shrink={false} space="3" vertical="center">
            <ChildIcon>
              <IconNodeRuntime />
            </ChildIcon>
          </Row>
        </Child>
      </Children>
    </>
  );
}

export function SolidStartSiteCard(props: CardProps<"SolidStartSite">) {
  return (
    <>
      <Header
        resource={props.resource}
        description={
          props.resource.metadata.customDomainUrl ||
          props.resource.metadata.url ||
          cleanFilepath(props.resource.metadata.path)
        }
      />
      <Children>
        <FunctionChild id={props.resource.metadata.server} tag="Server" />
      </Children>
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
                    <Text
                      line
                      code
                      size="mono_base"
                      leading="normal"
                      style={{ "min-width": "33%" }}
                    >
                      {output.OutputKey}
                    </Text>
                    <Row space="3" vertical="center">
                      <Text
                        code
                        line
                        size="mono_base"
                        color="dimmed"
                        leading="normal"
                      >
                        {output.OutputValue}
                      </Text>
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
              Functions
            </Text>
          </Row>
          <Text code color="dimmed" size="mono_base" on="surface">
            Function
          </Text>
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

function formatBytes(bytes: number, decimals = 2) {
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return {
    unit: sizes[i],
    value: parseFloat((bytes / Math.pow(k, i)).toFixed(dm)),
  };
}

function FunctionChild(props: {
  id: string | undefined;
  tag?: string;
  title?: string;
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
            <ChildTitleLink href={`./logs/${exists().id}`}>
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
          <Row shrink={false} space="3" vertical="center">
            <Show when={fn() && fn()!.enrichment.size}>
              {(value) => {
                const formattedSize = formatBytes(value());
                return (
                  <ChildDetail>
                    {formattedSize.value}
                    <Text
                      color="secondary"
                      on="surface"
                      size="xs"
                      weight="medium"
                      style={{ padding: "3px" }}
                    >
                      {formattedSize.unit}
                    </Text>
                  </ChildDetail>
                );
              }}
            </Show>
            <ChildIcon>
              <IconNodeRuntime />
            </ChildIcon>
          </Row>
        </Child>
      )}
    </Show>
  );
}
