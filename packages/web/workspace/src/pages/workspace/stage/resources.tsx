import { createSubscription } from "$/providers/replicache";
import { ResourceStore } from "$/data/resource";
import { For, JSX, Match, Show, Switch, createMemo } from "solid-js";
import { useStageContext } from "./context";
import { styled } from "@macaron-css/solid";
import { theme } from "$/ui/theme";
import { utility } from "$/ui/utility";
import { Row } from "$/ui/layout";
import {
  IconApi,
  IconRDS,
  IconJob,
  IconAuth,
  IconCron,
  IconTopic,
  IconTable,
  IconQueue,
  IconConfig,
  IconScript,
  IconBucket,
  IconAppSync,
  IconCognito,
  IconEventBus,
  IconAstroSite,
  IconConstruct,
  IconRemixSite,
  IconStaticSite,
  IconNextjsSite,
  IconNodeRuntime,
  IconWebSocketApi,
  IconSvelteKitSite,
  IconPythonRuntime,
  IconKinesisStream,
  IconSolidStartSite,
  IconApiGatewayV1Api,
} from "$/ui/icons/custom";
import { Resource } from "@console/core/app/resource";
import { Link, useSearchParams } from "@solidjs/router";
import { DUMMY_RESOURCES } from "./resources-dummy";

const Card = styled("div", {
  base: {
    borderRadius: 4,
    backgroundColor: theme.color.background.surface,
  },
  variants: {
    type: {
      default: {},
      outputs: {
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
    padding: `${theme.space[3]} ${theme.space[3]}`,
    gap: theme.space[4],
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
    fontFamily: theme.fonts.body,
    flexShrink: 0,
    fontSize: "0.875rem",
  },
});

const HeaderDescription = styled("div", {
  base: {
    ...utility.textLine(),
    maxWidth: "500px",
    fontWeight: "400",
    fontSize: "0.8125rem",
    lineHeight: "normal",
    color: theme.color.text.secondary,
  },
});

const HeaderType = styled("div", {
  base: {
    fontSize: "0.8125rem",
    fontWeight: "400",
    color: theme.color.text.secondary,
  },
});

const Children = styled("div", {
  base: {
    ...utility.stack(0),
    padding: `0 ${theme.space[3]}`,
    borderTop: `1px solid ${theme.color.divider.surface}`,
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
});

export const ChildTitleLink = styled(Link, {
  base: {
    ...utility.textLine(),
    fontSize: "0.875rem",
    lineHeight: "normal",
    fontFamily: theme.fonts.code,
  },
});

export const ChildTitle = styled("span", {
  base: {
    ...utility.textLine(),
    fontSize: "0.875rem",
  },
});

export const ChildDetail = styled("span", {
  base: {
    ...utility.textLine(),
    color: theme.color.text.secondary,
    fontSize: "0.8125rem",
    fontFamily: theme.fonts.code,
    textAlign: "right",
    lineHeight: "normal",
  },
});
export const ChildExtra = styled("span", {
  base: {
    color: theme.color.text.dimmed,
    fontSize: "0.625rem",
    textTransform: "uppercase",
    fontFamily: theme.fonts.code,
    whiteSpace: "nowrap",
  },
});

export const ChildIcon = styled("div", {
  base: {
    flexShrink: 0,
    width: 16,
    color: theme.color.icon.dimmed,
  },
});

export const ChildTag = styled("div", {
  base: {
    flex: "0 0 auto",
    padding: "5px 8px 4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: theme.color.text.dimmed,
    fontSize: "0.5625rem",
    textTransform: "uppercase",
    border: `1px solid ${theme.color.divider.base}`,
    borderRadius: theme.borderRadius,
  },
  variants: {
    size: {
      large: {
        paddingLeft: 0,
        paddingRight: 0,
        width: "85px",
      },
      small: {
        paddingLeft: 0,
        paddingRight: 0,
        width: "50px",
      },
      auto: {},
    },
  },
});

interface HeaderProps {
  resource: Resource.Info;
  icon?: (props: any) => JSX.Element;
  description?: string;
}
export function Header(props: HeaderProps) {
  return (
    <HeaderRoot>
      <Row space="2" vertical="center">
        <Show when={props.icon}>
          {(icon) => (
            <HeaderIcon title={props.resource.type}>{icon()({})}</HeaderIcon>
          )}
        </Show>
        <HeaderName>{props.resource.cfnID}</HeaderName>
        <HeaderDescription>{props.description}</HeaderDescription>
      </Row>
      <HeaderType>{props.resource.type}</HeaderType>
    </HeaderRoot>
  );
}

export function Resources() {
  const { stage } = useStageContext();
  const [query] = useSearchParams();
  const resources = createSubscription(
    () =>
      query.dummy
        ? async (): Promise<Resource.Info[]> => {
            return DUMMY_RESOURCES;
          }
        : ResourceStore.forStage(stage.id),
    []
  );
  return (
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
              {(resource) => (
                <ApiCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "ApiGatewayV1Api" && resource}>
              {(resource) => (
                <ApiGatewayV1ApiCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "AppSync" && resource}>
              {(resource) => (
                <AppSyncCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "WebSocketApi" && resource}>
              {(resource) => (
                <WebSocketApiCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "EventBus" && resource}>
              {(resource) => (
                <EventBusCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "NextjsSite" && resource}>
              {(resource) => (
                <NextjsSiteCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "SvelteKitSite" && resource}>
              {(resource) => (
                <SvelteKitSiteCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "AstroSite" && resource}>
              {(resource) => (
                <AstroSiteCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "RemixSite" && resource}>
              {(resource) => (
                <RemixSiteCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "SolidStartSite" && resource}>
              {(resource) => (
                <SolidStartSiteCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "StaticSite" && resource}>
              {(resource) => (
                <StaticSiteCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "RDS" && resource}>
              {(resource) => (
                <RDSCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "Topic" && resource}>
              {(resource) => (
                <TopicCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "KinesisStream" && resource}>
              {(resource) => (
                <KinesisStreamCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "Queue" && resource}>
              {(resource) => (
                <QueueCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "Bucket" && resource}>
              {(resource) => (
                <BucketCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "Cognito" && resource}>
              {(resource) => (
                <CognitoCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "Cron" && resource}>
              {(resource) => (
                <CronCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "Table" && resource}>
              {(resource) => (
                <TableCard resource={resource()} all={resources()} />
              )}
            </Match>
          </Switch>
        </Card>
      )}
    </For>
  );
}

interface CardProps<Type extends Resource.Info["type"]> {
  resource: Extract<Resource.Info, { type: Type }>;
  all: Resource.Info[];
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
              const fn = createMemo(
                () =>
                  props.all.find(
                    (r) => r.type === "Function" && r.addr === route.fn?.node
                  ) as Extract<Resource.Info, { type: "Function" }>
              );
              const method = createMemo(() => route.route.split(" ")[0]);
              const path = createMemo(() => route.route.split(" ")[1]);
              return (
                <Show when={fn()}>
                  <Child>
                    <Row space="2" vertical="center">
                      <ChildTag size="small">{method()}</ChildTag>
                      <ChildTitleLink href={`./logs/${fn().id}`}>
                        {path()}
                      </ChildTitleLink>
                    </Row>
                    <Row shrink={false} space="3" vertical="center">
                      <Show when={fn() && fn().enrichment.size}>
                        {(value) => (
                          <ChildDetail>
                            {Math.ceil(value() / 1024)} KB
                          </ChildDetail>
                        )}
                      </Show>
                      <ChildIcon>
                        <IconNodeRuntime />
                      </ChildIcon>
                    </Row>
                  </Child>
                </Show>
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
      {props.resource.metadata.routes.length > 0 && (
        <Children>
          <For each={props.resource.metadata.routes}>
            {(route) => {
              const fn = createMemo(
                () =>
                  props.all.find(
                    (r) => r.type === "Function" && r.addr === route.fn?.node
                  ) as Extract<Resource.Info, { type: "Function" }>
              );
              const method = createMemo(() => route.route.slice(1));
              return (
                <Show when={fn()}>
                  <Child>
                    <Row space="2" vertical="center">
                      <ChildTag size="large">{method()}</ChildTag>
                      <ChildTitleLink href={`logs/${fn().id}`}>
                        {fn().metadata.handler}
                      </ChildTitleLink>
                    </Row>
                    <Row shrink={false} space="3" vertical="center">
                      <Show when={fn() && fn().enrichment.size}>
                        {(value) => (
                          <ChildDetail>
                            {Math.ceil(value() / 1024)} KB
                          </ChildDetail>
                        )}
                      </Show>
                      <ChildIcon>
                        <IconNodeRuntime />
                      </ChildIcon>
                    </Row>
                  </Child>
                </Show>
              );
            }}
          </For>
        </Children>
      )}
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
      {props.resource.metadata.routes.length > 0 && (
        <Children>
          <For each={props.resource.metadata.routes}>
            {(route) => {
              const fn = createMemo(
                () =>
                  props.all.find(
                    (r) => r.type === "Function" && r.addr === route.fn?.node
                  ) as Extract<Resource.Info, { type: "Function" }>
              );
              const method = createMemo(() => route.route.split(" ")[0]);
              const path = createMemo(() => route.route.split(" ")[1]);
              return (
                <Show when={fn()}>
                  <Child>
                    <Row space="2" vertical="center">
                      <ChildTag size="small">{method()}</ChildTag>
                      <ChildTitleLink href={`logs/${fn().id}`}>
                        {path()}
                      </ChildTitleLink>
                    </Row>
                    <Row shrink={false} space="3" vertical="center">
                      <Show when={fn() && fn().enrichment.size}>
                        {(value) => (
                          <ChildDetail>
                            {Math.ceil(value() / 1024)} KB
                          </ChildDetail>
                        )}
                      </Show>
                      <ChildIcon>
                        <IconNodeRuntime />
                      </ChildIcon>
                    </Row>
                  </Child>
                </Show>
              );
            }}
          </For>
        </Children>
      )}
    </>
  );
}

export function EventBusCard(props: CardProps<"EventBus">) {
  return (
    <>
      <Header icon={IconEventBus} resource={props.resource} />
      {props.resource.metadata.rules.length > 0 && (
        <Children>
          <For each={props.resource.metadata.rules}>
            {(rule) => (
              <For each={rule.targets}>
                {(target) => {
                  const fn = createMemo(
                    () =>
                      props.all.find(
                        (r) => r.type === "Function" && r.addr === target?.node
                      ) as Extract<Resource.Info, { type: "Function" }>
                  );
                  return (
                    <Child>
                      <Row space="2" vertical="center">
                        <ChildTag>Subscription</ChildTag>
                        <ChildTitleLink href={`./logs/${fn().id}`}>
                          {fn().metadata.handler}
                        </ChildTitleLink>
                      </Row>
                      <Row shrink={false} space="3" vertical="center">
                        <Show when={fn() && fn().enrichment.size}>
                          {(value) => (
                            <ChildDetail>
                              {Math.ceil(value() / 1024)} KB
                            </ChildDetail>
                          )}
                        </Show>
                        <ChildIcon>
                          <IconNodeRuntime />
                        </ChildIcon>
                      </Row>
                    </Child>
                  );
                }}
              </For>
            )}
          </For>
        </Children>
      )}
    </>
  );
}

export function TopicCard(props: CardProps<"Topic">) {
  return (
    <>
      <Header icon={IconTopic} resource={props.resource} />
      {props.resource.metadata.subscribers.length > 0 && (
        <Children>
          <For each={props.resource.metadata.subscribers}>
            {(subscriber) => {
              const fn = createMemo(
                () =>
                  props.all.find(
                    (r) => r.type === "Function" && r.addr === subscriber?.node
                  ) as Extract<Resource.Info, { type: "Function" }>
              );
              return (
                <Child>
                  <Row space="2" vertical="center">
                    <ChildTag>Subscriber</ChildTag>
                    <ChildTitleLink href={`./logs/${fn().id}`}>
                      {fn().metadata.handler}
                    </ChildTitleLink>
                  </Row>
                  <Row shrink={false} space="3" vertical="center">
                    <Show when={fn() && fn().enrichment.size}>
                      {(value) => (
                        <ChildDetail>
                          {Math.ceil(value() / 1024)} KB
                        </ChildDetail>
                      )}
                    </Show>
                    <ChildIcon>
                      <IconNodeRuntime />
                    </ChildIcon>
                  </Row>
                </Child>
              );
            }}
          </For>
        </Children>
      )}
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
            {(notification) => {
              const fn = createMemo(
                () =>
                  props.all.find(
                    (r) =>
                      r.type === "Function" && r.addr === notification?.node
                  ) as Extract<Resource.Info, { type: "Function" }>
              );
              return (
                <Child>
                  <Row space="2" vertical="center">
                    <ChildTag>Notification</ChildTag>
                    <ChildTitleLink href={`./logs/${fn().id}`}>
                      {fn().metadata.handler}
                    </ChildTitleLink>
                  </Row>
                  <Row shrink={false} space="3" vertical="center">
                    <Show when={fn() && fn().enrichment.size}>
                      {(value) => (
                        <ChildDetail>
                          {Math.ceil(value() / 1024)} KB
                        </ChildDetail>
                      )}
                    </Show>
                    <ChildIcon>
                      <IconNodeRuntime />
                    </ChildIcon>
                  </Row>
                </Child>
              );
            }}
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
      {props.resource.metadata.consumers.length > 0 && (
        <Children>
          <For each={props.resource.metadata.consumers}>
            {(consumer) => {
              if (consumer.fn === undefined) {
                return;
              }
              const fn = createMemo(
                () =>
                  props.all.find(
                    (r) => r.type === "Function" && r.addr === consumer.fn?.node
                  ) as Extract<Resource.Info, { type: "Function" }>
              );
              return (
                <Child>
                  <Row space="2" vertical="center">
                    <ChildTag>Consumer</ChildTag>
                    <ChildTitleLink href={`./logs/${fn().id}`}>
                      {fn().metadata.handler}
                    </ChildTitleLink>
                  </Row>
                  <Row shrink={false} space="3" vertical="center">
                    <Show when={fn() && fn().enrichment.size}>
                      {(value) => (
                        <ChildDetail>
                          {Math.ceil(value() / 1024)} KB
                        </ChildDetail>
                      )}
                    </Show>
                    <ChildIcon>
                      <IconNodeRuntime />
                    </ChildIcon>
                  </Row>
                </Child>
              );
            }}
          </For>
        </Children>
      )}
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
      {props.resource.metadata.dataSources.length > 0 && (
        <Children>
          <For each={props.resource.metadata.dataSources}>
            {(dataSource) => {
              if (dataSource.fn === undefined) {
                return;
              }
              const fn = createMemo(
                () =>
                  props.all.find(
                    (r) =>
                      r.type === "Function" && r.addr === dataSource.fn?.node
                  ) as Extract<Resource.Info, { type: "Function" }>
              );
              return (
                <Child>
                  <Row space="2" vertical="center">
                    <ChildTag>Source</ChildTag>
                    <ChildTitleLink href={`./logs/${fn().id}`}>
                      {fn().metadata.handler}
                    </ChildTitleLink>
                  </Row>
                  <Row shrink={false} space="3" vertical="center">
                    <Show when={fn() && fn().enrichment.size}>
                      {(value) => (
                        <ChildDetail>
                          {Math.ceil(value() / 1024)} KB
                        </ChildDetail>
                      )}
                    </Show>
                    <ChildIcon>
                      <IconNodeRuntime />
                    </ChildIcon>
                  </Row>
                </Child>
              );
            }}
          </For>
        </Children>
      )}
    </>
  );
}
export function TableCard(props: CardProps<"Table">) {
  return (
    <>
      <Header icon={IconTable} resource={props.resource} />
      {props.resource.metadata.consumers.length > 0 && (
        <Children>
          <For each={props.resource.metadata.consumers}>
            {(consumer) => {
              if (consumer.fn === undefined) {
                return;
              }
              const fn = createMemo(
                () =>
                  props.all.find(
                    (r) => r.type === "Function" && r.addr === consumer.fn?.node
                  ) as Extract<Resource.Info, { type: "Function" }>
              );
              return (
                <Child>
                  <Row space="2" vertical="center">
                    <ChildTag>Consumer</ChildTag>
                    <ChildTitleLink href={`./logs/${fn().id}`}>
                      {fn().metadata.handler}
                    </ChildTitleLink>
                  </Row>
                  <Row shrink={false} space="3" vertical="center">
                    <Show when={fn() && fn().enrichment.size}>
                      {(value) => (
                        <ChildDetail>
                          {Math.ceil(value() / 1024)} KB
                        </ChildDetail>
                      )}
                    </Show>
                    <ChildIcon>
                      <IconNodeRuntime />
                    </ChildIcon>
                  </Row>
                </Child>
              );
            }}
          </For>
        </Children>
      )}
    </>
  );
}

export function CognitoCard(props: CardProps<"Cognito">) {
  return (
    <>
      <Header icon={IconCognito} resource={props.resource} />
      {props.resource.metadata.triggers.length > 0 && (
        <Children>
          <For each={props.resource.metadata.triggers}>
            {(trigger) => {
              const fn = createMemo(
                () =>
                  props.all.find(
                    (r) => r.type === "Function" && r.addr === trigger.fn?.node
                  ) as Extract<Resource.Info, { type: "Function" }>
              );
              return (
                <Child>
                  <Row space="2" vertical="center">
                    <ChildTag>Trigger</ChildTag>
                    <ChildTitleLink href={`./logs/${fn().id}`}>
                      {fn().metadata.handler}
                    </ChildTitleLink>
                  </Row>
                  <Row shrink={false} space="3" vertical="center">
                    <Show when={fn() && fn().enrichment.size}>
                      {(value) => (
                        <ChildDetail>
                          {Math.ceil(value() / 1024)} KB
                        </ChildDetail>
                      )}
                    </Show>
                    <ChildIcon>
                      <IconNodeRuntime />
                    </ChildIcon>
                  </Row>
                </Child>
              );
            }}
          </For>
        </Children>
      )}
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
      <Show when={props.resource.metadata.job}>
        {(job) => {
          const fn = props.all.find(
            (r) => r.type === "Function" && r.addr === job().node
          ) as Extract<Resource.Info, { type: "Function" }>;
          return (
            <Children>
              <Child>
                <Row space="2" vertical="center">
                  <ChildTag>Job</ChildTag>
                  <ChildTitleLink href={`logs/${fn.id}`}>
                    {fn.metadata.handler}
                  </ChildTitleLink>
                </Row>
                <Row shrink={false} space="3" vertical="center">
                  <Show when={fn && fn.enrichment.size}>
                    {(value) => (
                      <ChildDetail>{Math.ceil(value() / 1024)} KB</ChildDetail>
                    )}
                  </Show>
                  <ChildIcon>
                    <IconNodeRuntime />
                  </ChildIcon>
                </Row>
              </Child>
            </Children>
          );
        }}
      </Show>
    </>
  );
}

export function QueueCard(props: CardProps<"Queue">) {
  return (
    <>
      <Header icon={IconQueue} resource={props.resource} />
      <Show when={props.resource.metadata.consumer}>
        {(consumer) => {
          const fn = props.all.find(
            (r) => r.type === "Function" && r.addr === consumer().node
          ) as Extract<Resource.Info, { type: "Function" }>;
          return (
            <Children>
              <Child>
                <Row space="2" vertical="center">
                  <ChildTag>Consumer</ChildTag>
                  <ChildTitleLink href={`logs/${fn.id}`}>
                    {fn.metadata.handler}
                  </ChildTitleLink>
                </Row>
                <Row shrink={false} space="3" vertical="center">
                  <Show when={fn && fn.enrichment.size}>
                    {(value) => (
                      <ChildDetail>{Math.ceil(value() / 1024)} KB</ChildDetail>
                    )}
                  </Show>
                  <ChildIcon>
                    <IconNodeRuntime />
                  </ChildIcon>
                </Row>
              </Child>
            </Children>
          );
        }}
      </Show>
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
          props.resource.metadata.path
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
          props.resource.metadata.path
        }
      />
      <Show when={props.resource.metadata.server}>
        {(server) => {
          const fn = props.all.find(
            (r) => r.type === "Function" && r.metadata.arn === server()
          ) as Extract<Resource.Info, { type: "Function" }>;
          return (
            <Children>
              <Child>
                <Row space="2" vertical="center">
                  <ChildTag>Server</ChildTag>
                  <ChildTitleLink href={`logs/${fn.id}`}>
                    {fn.metadata.handler}
                  </ChildTitleLink>
                </Row>
                <Row shrink={false} space="3" vertical="center">
                  <Show when={fn && fn.enrichment.size}>
                    {(value) => (
                      <ChildDetail>{Math.ceil(value() / 1024)} KB</ChildDetail>
                    )}
                  </Show>
                  <ChildIcon>
                    <IconNodeRuntime />
                  </ChildIcon>
                </Row>
              </Child>
            </Children>
          );
        }}
      </Show>
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
          props.resource.metadata.path
        }
      />
      <Show when={props.resource.metadata.server}>
        {(server) => {
          const fn = props.all.find(
            (r) => r.type === "Function" && r.metadata.arn === server()
          ) as Extract<Resource.Info, { type: "Function" }>;
          return (
            <Children>
              <Child>
                <Row space="2" vertical="center">
                  <ChildTag>Server</ChildTag>
                  <ChildTitleLink href={`logs/${fn.id}`}>
                    {fn.metadata.handler}
                  </ChildTitleLink>
                </Row>
                <Row shrink={false} space="3" vertical="center">
                  <Show when={fn && fn.enrichment.size}>
                    {(value) => (
                      <ChildDetail>{Math.ceil(value() / 1024)} KB</ChildDetail>
                    )}
                  </Show>
                  <ChildIcon>
                    <IconNodeRuntime />
                  </ChildIcon>
                </Row>
              </Child>
            </Children>
          );
        }}
      </Show>
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
          props.resource.metadata.path
        }
      />
      <Show when={props.resource.metadata.server}>
        {(server) => {
          const fn = props.all.find(
            (r) => r.type === "Function" && r.metadata.arn === server()
          ) as Extract<Resource.Info, { type: "Function" }>;
          return (
            <Children>
              <Child>
                <Row space="2" vertical="center">
                  <ChildTag>Server</ChildTag>
                  <ChildTitleLink href={`logs/${fn.id}`}>
                    {fn.metadata.handler}
                  </ChildTitleLink>
                </Row>
                <Row shrink={false} space="3" vertical="center">
                  <Show when={fn && fn.enrichment.size}>
                    {(value) => (
                      <ChildDetail>{Math.ceil(value() / 1024)} KB</ChildDetail>
                    )}
                  </Show>
                  <ChildIcon>
                    <IconNodeRuntime />
                  </ChildIcon>
                </Row>
              </Child>
            </Children>
          );
        }}
      </Show>
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
          props.resource.metadata.path
        }
      />
      <Show when={props.resource.metadata.server}>
        {(server) => {
          const fn = props.all.find(
            (r) => r.type === "Function" && r.metadata.arn === server()
          ) as Extract<Resource.Info, { type: "Function" }>;
          return (
            <Children>
              <Child>
                <Row space="2" vertical="center">
                  <ChildTag>Server</ChildTag>
                  <ChildTitleLink href={`logs/${fn.id}`}>
                    {fn.metadata.handler}
                  </ChildTitleLink>
                </Row>
                <Row shrink={false} space="3" vertical="center">
                  <Show when={fn && fn.enrichment.size}>
                    {(value) => (
                      <ChildDetail>{Math.ceil(value() / 1024)} KB</ChildDetail>
                    )}
                  </Show>
                  <ChildIcon>
                    <IconNodeRuntime />
                  </ChildIcon>
                </Row>
              </Child>
            </Children>
          );
        }}
      </Show>
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
          props.resource.metadata.path
        }
      />
      <Show when={props.resource.metadata.server}>
        {(server) => {
          const fn = props.all.find(
            (r) => r.type === "Function" && r.metadata.arn === server()
          ) as Extract<Resource.Info, { type: "Function" }>;
          return (
            <Children>
              <Child>
                <Row space="2" vertical="center">
                  <ChildTag>Server</ChildTag>
                  <ChildTitleLink href={`logs/${fn.id}`}>
                    {fn.metadata.handler}
                  </ChildTitleLink>
                </Row>
                <Row shrink={false} space="3" vertical="center">
                  <Show when={fn && fn.enrichment.size}>
                    {(value) => (
                      <ChildDetail>{Math.ceil(value() / 1024)} KB</ChildDetail>
                    )}
                  </Show>
                  <ChildIcon>
                    <IconNodeRuntime />
                  </ChildIcon>
                </Row>
              </Child>
            </Children>
          );
        }}
      </Show>
    </>
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
