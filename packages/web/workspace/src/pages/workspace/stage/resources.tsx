import {
  For,
  JSX,
  Match,
  Show,
  Switch,
  createMemo,
  ComponentProps,
} from "solid-js";
import { useFunctionsContext, useResourcesContext } from "./context";
import { styled } from "@macaron-css/solid";
import { theme } from "$/ui/theme";
import { utility } from "$/ui/utility";
import { Fullscreen, Row } from "$/ui/layout";
import { Tag, Text } from "$/ui";
import {
  IconApi,
  IconRDS,
  IconCron,
  IconTopic,
  IconTable,
  IconQueue,
  IconBucket,
  IconAppSync,
  IconCognito,
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
  IconFunction,
} from "$/ui/icons/custom";
import { Resource } from "@console/core/app/resource";
import { Link, useNavigate } from "@solidjs/router";
import { Syncing } from "$/ui/loader";
import { IconDocumentDuplicate } from "$/ui/icons";
import {} from "@solid-primitives/keyboard";
import { createEventListener } from "@solid-primitives/event-listener";

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

const HeaderName = styled("div", {
  base: {
    fontWeight: "500",
    fontFamily: theme.font.family.body,
    flexShrink: 0,
    fontSize: theme.font.size.base,
  },
});

const HeaderDescription = styled("div", {
  base: {
    ...utility.textLine(),
    maxWidth: "500px",
    fontSize: theme.font.size.base,
    lineHeight: "normal",
    color: theme.color.text.secondary.base,
  },
});

const HeaderType = styled("div", {
  base: {
    color: theme.color.text.secondary.base,
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_base,
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
    color: theme.color.text.secondary.base,
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
  return (
    <HeaderRoot>
      <Row space="3" vertical="center">
        <Row space="1.5" vertical="center">
          <Show when={props.icon}>
            {(icon) => (
              <HeaderIcon title={props.resource.type}>{icon()({})}</HeaderIcon>
            )}
          </Show>
          <HeaderName>{props.resource.cfnID}</HeaderName>
        </Row>
        <HeaderDescription>{props.description}</HeaderDescription>
      </Row>
      <HeaderType>{props.resource.type}</HeaderType>
    </HeaderRoot>
  );
}

export function Resources() {
  const resources = useResourcesContext();
  return (
    <>
      <Show when={!resources().length}>
        <Fullscreen>
          <Syncing>Waiting for resources</Syncing>
        </Fullscreen>
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
    </>
  );
}

interface CardProps<Type extends Resource.Info["type"]> {
  resource: Extract<Resource.Info, { type: Type }>;
}

export function ApiCard(props: CardProps<"Api">) {
  return (
    <>
      <Header
        icon={IconApi}
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
        icon={IconWebSocketApi}
        resource={props.resource}
        description={
          props.resource.metadata.customDomainUrl ||
          props.resource.enrichment.cloudfrontUrl
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
        icon={IconApiGatewayV1Api}
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
      <Header icon={IconEventBus} resource={props.resource} />
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
      <Header icon={IconTopic} resource={props.resource} />
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
      <Header icon={IconBucket} resource={props.resource} />
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
      <Header icon={IconKinesisStream} resource={props.resource} />
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
        icon={IconAppSync}
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
      <Header icon={IconTable} resource={props.resource} />
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
      <Header icon={IconCognito} resource={props.resource} />
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
        icon={IconCron}
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
      <Header icon={IconQueue} resource={props.resource} />
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
        icon={IconStaticSite}
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
        icon={IconNextjsSite}
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

export function SvelteKitSiteCard(props: CardProps<"SvelteKitSite">) {
  return (
    <>
      <Header
        icon={IconSvelteKitSite}
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
        icon={IconRemixSite}
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
        icon={IconAstroSite}
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
              {props.resource.metadata.path}
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
        icon={IconSolidStartSite}
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
          <HeaderName>Outputs</HeaderName>
        </HeaderRoot>
        <Children outputs>
          <For each={outputs()}>
            {(output) => (
              <Show
                when={output.OutputValue && output.OutputValue?.trim() !== ""}
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
                    <ChildIconButton>
                      <IconDocumentDuplicate />
                    </ChildIconButton>
                  </Row>
                </Child>
              </Show>
            )}
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
            <HeaderName>Functions</HeaderName>
          </Row>
          <HeaderType>Function</HeaderType>
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
        icon={IconRDS}
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
              <Show when={props.title} fallback={exists().metadata.handler}>
                {props.title}
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
                    <ChildDetailUnit>{formattedSize.unit}</ChildDetailUnit>
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
