import { createSubscription } from "$/providers/replicache";
import { ResourceStore } from "$/data/resource";
import { For, JSX, Match, Show, Switch, createMemo } from "solid-js";
import { useStageContext } from "./context";
import { styled } from "@macaron-css/solid";
import { theme } from "$/ui/theme";
import { utility } from "$/ui/utility";
import { Row } from "$/ui/layout";
import { IconAPI, IconNodeRuntime } from "$/ui/icons/custom";
import { Resource } from "@console/core/app/resource";
import { IconEnvelope, IconGlobeAmericas } from "$/ui/icons";
import { useSearchParams } from "@solidjs/router";
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
    width: 16,
    height: 16,
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

export const ChildTitleLink = styled("a", {
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
    color: theme.color.text.dimmed,
    opacity: 0.85,
    ":hover": {
      color: theme.color.text.secondary,
    },
  },
});

export const ChildTag = styled("div", {
  base: {
    flex: "0 0 auto",
    width: "50px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: theme.color.text.secondary,
    fontSize: "0.5625rem",
    textTransform: "uppercase",
    border: `1px solid ${theme.color.divider.base}`,
    borderRadius: theme.borderRadius,
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
          {(icon) => <HeaderIcon>{icon()({})}</HeaderIcon>}
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
            r.type === "Api" || r.type === "StaticSite" || r.type === "EventBus"
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
            <Match when={resource.type === "EventBus" && resource}>
              {(resource) => (
                <EventBusCard resource={resource()} all={resources()} />
              )}
            </Match>
            <Match when={resource.type === "StaticSite" && resource}>
              {(resource) => (
                <StaticSiteCard resource={resource()} all={resources()} />
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
        icon={IconAPI}
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
                      <ChildTag>{method()}</ChildTag>
                      <ChildTitleLink
                        href={`https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252F${
                          fn().metadata.arn.split("function:")[1]
                        }`}
                      >
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
      <Header icon={IconEnvelope} resource={props.resource} />
      {props.resource.metadata.rules.length > 0 && (
        <Children>
          <For each={props.resource.metadata.rules}>
            {(rule) => (
              <For each={rule.targets}>
                {(target, i) => {
                  const fn = createMemo(
                    () =>
                      props.all.find(
                        (r) => r.type === "Function" && r.addr === target?.node
                      ) as Extract<Resource.Info, { type: "Function" }>
                  );
                  return (
                    <Child>
                      <Row space="2" vertical="center">
                        <ChildTitleLink>{rule.key}</ChildTitleLink>
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

export function StaticSiteCard(props: CardProps<"StaticSite">) {
  return (
    <>
      <Header
        icon={IconGlobeAmericas}
        resource={props.resource}
        description={
          props.resource.metadata.customDomainUrl ||
          props.resource.enrichment.cloudfrontUrl
        }
      />
    </>
  );
}
