import { globalStyle, globalKeyframes } from "@macaron-css/core";
import { Grower, Stack, Row } from "$/ui/layout";
import { styled } from "@macaron-css/solid";
import { theme } from "$/ui/theme";
import { IconChevronLeft, IconBoltSolid } from "$/ui/icons";
import { Tag } from "$/ui/tag";
import { Button } from "$/ui/button";
import { utility } from "$/ui/utility";
import {
  IconCaretRight,
  IconEventBus,
  IconNodeRuntime,
} from "$/ui/icons/custom";
import { JSX, ComponentProps, Show, For } from "solid-js";
import { prop } from "remeda";
import { Logs } from "../workspace/stage/logs";

const ComponentRoot = styled("div", {
  base: {
    padding: theme.space[4],
  },
});

const ComponentName = styled("h1", {
  base: {
    fontSize: "0.9375rem",
    textTransform: "uppercase",
    paddingBottom: theme.space[6],
    fontFamily: theme.fonts.heading,
  },
});

const ComponentVariants = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: theme.space[4],
  },
});

const VariantRoot = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: theme.space[4],
  },
});

const VariantName = styled("h2", {
  base: {
    fontSize: "0.8125rem",
    textTransform: "uppercase",
    fontFamily: theme.fonts.heading,
  },
});

const VariantContent = styled("div", {
  base: {
    display: "flex",
    gap: theme.space[2],
    border: `1px solid ${theme.color.divider.base}`,
    padding: theme.space[4],
    borderRadius: theme.borderRadius,
  },
});

const VariantThemes = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: theme.space[2],
  },
});

interface ComponentTypeProps {
  name: string;
  children: JSX.Element;
}

interface VariantProps {
  themes?: boolean;
  name: string;
  children: JSX.Element;
}

function ComponentType(props: ComponentTypeProps) {
  return (
    <ComponentRoot>
      <ComponentName>{props.name}</ComponentName>
      <ComponentVariants>{props.children}</ComponentVariants>
    </ComponentRoot>
  );
}

function Variant(props: VariantProps) {
  return (
    <VariantRoot>
      <VariantName>{props.name}</VariantName>
      <VariantContent>{props.children}</VariantContent>
    </VariantRoot>
  );
}
const OverflowSpan = styled("span", {
  base: {
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
});

export function Design() {
  return (
    <>
      <ComponentType name="LogsEmptyLoadingIndicator">
        <Variant name="Default">
          <Grower>
            <LogsEmptyLoadingIndicator />
          </Grower>
        </Variant>
      </ComponentType>
      <ComponentType name="LogsHeader">
        <Variant name="Default">
          <Grower>
            <LogsHeader
              handler="packages/functions/src/events/app-stage-updated.handler"
              construct="EventBus"
              constructName="bus"
              event="subscription"
              route="/replicache/push"
            />
          </Grower>
        </Variant>
      </ComponentType>
      <ComponentType name="Button">
        <Variant name="Primary">
          <Button color="primary">Button</Button>
          <Button data-state-hover color="primary">
            Button
          </Button>
          <Button data-state-active color="primary">
            Button
          </Button>
          <Button disabled color="primary">
            Button
          </Button>
        </Variant>
        <Variant name="Danger">
          <Button color="danger">Button</Button>
          <Button data-state-hover color="danger">
            Button
          </Button>
          <Button data-state-active color="danger">
            Button
          </Button>
          <Button disabled color="danger">
            Button
          </Button>
        </Variant>
        <Variant name="Secondary">
          <Button color="secondary">Button</Button>
          <Button data-state-hover color="secondary">
            Button
          </Button>
          <Button data-state-active color="secondary">
            Button
          </Button>
          <Button disabled color="secondary">
            Button
          </Button>
        </Variant>
      </ComponentType>
      <ComponentType name="Tag">
        <Variant name="Solid">
          <Tag style="solid" level="info">
            Tag
          </Tag>
          <Tag style="solid" level="danger">
            Tag
          </Tag>
        </Variant>
        <Variant name="Outline">
          <Tag style="outline" level="info">
            Tag
          </Tag>
          <Tag style="outline" level="danger">
            Tag
          </Tag>
        </Variant>
      </ComponentType>
      <ComponentType name="Row">
        <Variant name="Default">
          <Row space="1">
            <span>Label</span>
            <span>Value</span>
          </Row>
        </Variant>
        <Variant name="Overflow">
          <Row space="1">
            <span>Label</span>
            <OverflowSpan>
              /notes/settings/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long
            </OverflowSpan>
          </Row>
        </Variant>
        <Variant name="No Shrink">
          <Row space="1">
            <OverflowSpan>
              /notes/settings/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long
            </OverflowSpan>
            <Row shrink={false} space="1">
              <span>11.2 MB</span>
              <span>us-east-1</span>
            </Row>
          </Row>
        </Variant>
      </ComponentType>
      <ComponentType name="Log">
        <Variant name="Default">
          <Grower>
            <Log
              level="info"
              duration={112873.27}
              start={Date.now()}
              message="RequestId: b77ebfc5-3b84-4b3b-8936-e4c2e266dced Duration: 80.97 ms Billed Duration: 81 ms Memory Size: 1024 MB Max Memory Used: 231 MB"
              link="https://google.com"
              requestId="3c8b6e33-3800-4b3d-acf2-e49e132c2197"
              entries={[]}
            />
          </Grower>
        </Variant>
        <Variant name="Expanded">
          <Grower>
            <Log
              expanded
              level="info"
              duration={112873.27}
              start={Date.now()}
              message="RequestId: b77ebfc5-3b84-4b3b-8936-e4c2e266dced Duration: 80.97 ms Billed Duration: 81 ms Memory Size: 1024 MB Max Memory Used: 231 MB"
              link="https://google.com"
              requestId="3c8b6e33-3800-4b3d-acf2-e49e132c2197"
              entries={[
                "START RequestId: 3c8b6e33-3800-4b3d-acf2-e49e132c2197 Version: $LATEST",
                "2023-06-21T13:57:53.802Z 3c8b6e33-3800-4b3d-acf2-e49e132c2197 INFO Lambda invoked ",
                "2023-06-21T13:57:53.827Z 3c8b6e33-3800-4b3d-acf2-e49e132c2197 INFO Lambda processing started ",
                "END RequestId: 3c8b6e33-3800-4b3d-acf2-e49e132c2197 ",
                "REPORT RequestId: 3c8b6e33-3800-4b3d-acf2-e49e132c2197 Duration: 80.54 ms Billed Duration: 81 ms Memory Size: 1024 MB Max Memory Used: 231 MB",
              ]}
            />
          </Grower>
        </Variant>
        <Variant name="Error">
          <Grower>
            <Log
              level="error"
              duration={112873.27}
              start={Date.now()}
              message="ERROR: Variable 's' is not defined"
              link="https://google.com"
              requestId="3c8b6e33-3800-4b3d-acf2-e49e132c2197"
              entries={[]}
            />
          </Grower>
        </Variant>
        <Variant name="Cold Start">
          <Grower>
            <Log
              coldStart
              level="info"
              duration={112873.27}
              start={Date.now()}
              message="Hello world"
              link="https://google.com"
              requestId="3c8b6e33-3800-4b3d-acf2-e49e132c2197"
              entries={[]}
            />
          </Grower>
        </Variant>
      </ComponentType>
      <ComponentType name="LogList">
        <Variant name="Default">
          <Grower>
            <LogList>
              <Log
                coldStart
                level="info"
                duration={112873.27}
                start={Date.now()}
                message="RequestId: b77ebfc5-3b84-4b3b-8936-e4c2e266dced Duration: 80.97 ms Billed Duration: 81 ms Memory Size: 1024 MB Max Memory Used: 231 MB"
                requestId="3c8b6e33-3800-4b3d-acf2-e49e132c2197"
                link="https://google.com"
                entries={[]}
              />
              <Log
                expanded
                level="error"
                duration={112873.27}
                start={Date.now()}
                message="Variable 's' is not defined"
                link="https://google.com"
                requestId="3c8b6e33-3800-4b3d-acf2-e49e132c2197"
                entries={[
                  "START RequestId: 3c8b6e33-3800-4b3d-acf2-e49e132c2197 Version: $LATEST",
                  "2023-06-21T13:57:53.802Z 3c8b6e33-3800-4b3d-acf2-e49e132c2197 INFO Lambda invoked ",
                  "2023-06-21T13:57:53.827Z 3c8b6e33-3800-4b3d-acf2-e49e132c2197 INFO Lambda processing started ",
                  "END RequestId: 3c8b6e33-3800-4b3d-acf2-e49e132c2197 ",
                  "REPORT RequestId: 3c8b6e33-3800-4b3d-acf2-e49e132c2197 Duration: 80.54 ms Billed Duration: 81 ms Memory Size: 1024 MB Max Memory Used: 231 MB, RequestId: 3c8b6e33-3800-4b3d-acf2-e49e132c2197 Duration: 80.54 ms Billed Duration: 81 ms Memory Size: 1024 MB Max Memory Used: 231 MB",
                ]}
              />
              <Log
                level="info"
                duration={112873.27}
                start={Date.now()}
                message="RequestId: b77ebfc5-3b84-4b3b-8936-e4c2e266dced Duration: 80.97 ms Billed Duration: 81 ms Memory Size: 1024 MB Max Memory Used: 231 MB"
                link="https://google.com"
                requestId="3c8b6e33-3800-4b3d-acf2-e49e132c2197"
                entries={[]}
              />
              <LogLoadingIndicator border space="1.5" vertical="center">
                <LogLoadingIndicatorIcon>
                  <IconBoltSolid />
                </LogLoadingIndicatorIcon>
                <LogLoadingIndicatorCopy>
                  Tailing logs&hellip;
                </LogLoadingIndicatorCopy>
              </LogLoadingIndicator>
            </LogList>
          </Grower>
        </Variant>
      </ComponentType>
    </>
  );
}

function formatTime(milliseconds: number) {
  return milliseconds < 1000
    ? milliseconds.toFixed(2) + "ms"
    : (milliseconds / 1000).toFixed(2) + "s";
}

const LogList = styled("div", {
  base: {
    borderStyle: "solid",
    borderColor: theme.color.divider.base,
    borderWidth: "0 1px 1px",
    borderRadius: theme.borderRadius,
  },
});

const LogLoadingIndicator = styled(Row, {
  base: {
    padding: `${theme.space[2.5]} ${theme.space[1.5]}`,
    borderTop: `1px solid ${theme.color.divider.base}`,
    borderRadius: `0 0 ${theme.borderRadius} ${theme.borderRadius}`,
  },
  variants: {
    border: {
      true: {},
      false: {
        borderTopWidth: 0,
      },
    },
  },
  defaultVariants: {
    border: false,
  },
});

const LogLoadingIndicatorIcon = styled("div", {
  base: {
    width: 15,
    height: 15,
    color: theme.color.text.dimmed,
    opacity: theme.iconOpacity,
    animation: "pulse 1.5s linear infinite",
  },
});

const LogLoadingIndicatorCopy = styled("div", {
  base: {
    color: theme.color.text.dimmed,
    fontSize: "0.8125rem",
  },
});

globalKeyframes("pulse", {
  "0%": {
    opacity: 0.3,
  },
  "50%": {
    opacity: 1,
  },
  "100%": {
    opacity: 0.3,
  },
});

const LogContainer = styled("div", {
  base: {
    borderTop: `1px solid ${theme.color.divider.base}`,
  },
  variants: {
    expanded: {
      true: {},
      false: {},
    },
    level: {
      info: {},
      error: {},
    },
  },
  defaultVariants: {
    expanded: false,
    level: "info",
  },
});

const LogSummary = styled(Row, {
  base: {
    gap: theme.space[1.5],
    borderStyle: "solid",
    borderColor: theme.color.divider.base,
    borderWidth: 0,
    padding: `${theme.space[2.5]} ${theme.space[1.5]}`,
    selectors: {
      [`${LogContainer.selector({ expanded: true })} &`]: {
        borderBottomWidth: 1,
      },
    },
  },
});

globalStyle(`${LogSummary} *`, {
  cursor: "pointer",
});

const LogText = styled("div", {
  base: {
    ...utility.textLine(),
    fontFamily: theme.fonts.code,
    fontSize: "0.75rem",
  },
});

const LogDate = styled(LogText, {
  base: {
    flexShrink: 0,
    fontSize: "0.75rem",
    paddingLeft: theme.space[2],
  },
});

const LogDuration = styled(LogText, {
  base: {
    flexShrink: 0,
    minWidth: 70,
    textAlign: "right",
    fontSize: "0.75rem",
    color: theme.color.text.secondary,
  },
  variants: {
    coldStart: {
      true: {
        color: `hsla(${theme.color.base.blue}, 100%)`,
      },
      false: {},
    },
  },
  defaultVariants: {
    coldStart: false,
  },
});

const LogRequestId = styled(LogText, {
  base: {
    paddingLeft: theme.space[2],
    flexShrink: 0,
    lineHeight: "normal",
    fontSize: "0.75rem",
    color: theme.color.text.secondary,
  },
});

const LogMessage = styled(LogText, {
  base: {
    flexGrow: 1,
    lineHeight: "normal",
    fontSize: "0.875rem",
    paddingLeft: theme.space[2],
    selectors: {
      [`${LogContainer.selector({ level: "error" })} &`]: {
        color: `hsla(${theme.color.base.red}, 100%)`,
      },
    },
  },
});

function LogLevel(props: { level?: string }) {
  const level = props.level || "info";
  return (
    <Tag size="small" level={level === "error" ? "danger" : "info"}>
      {level}
    </Tag>
  );
}

const CaretIcon = styled("div", {
  base: {
    width: 15,
    height: 15,
    flexShrink: 0,
    lineHeight: 0,
    color: theme.color.text.dimmed,
    opacity: theme.iconOpacity,
    transition: "transform 0.2s ease-out",
    selectors: {
      [`${LogContainer.selector({ expanded: true })} &`]: {
        transform: "rotate(90deg)",
      },
    },
  },
});

const LogDetail = styled("div", {
  base: {
    padding: theme.space[2.5],
  },
});

const LogDetailHeader = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: theme.space[2.5],
  },
});

const LogDetailHeaderTitle = styled("h6", {
  base: {
    paddingLeft: 1,
    fontSize: "0.75rem",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontFamily: theme.fonts.heading,
    color: theme.color.text.dimmed,
    fontWeight: 500,
  },
});

const LogLink = styled("a", {
  base: {
    fontSize: "0.75rem",
    paddingRight: 1,
  },
});

const LogEntries = styled("div", {
  base: {
    borderRadius: theme.borderRadius,
    paddingLeft: theme.space[3],
    paddingRight: theme.space[3],
    backgroundColor: theme.color.background.surface,
  },
});

const LogEntry = styled("div", {
  base: {
    borderTop: `1px solid ${theme.color.divider.surface}`,
    paddingTop: theme.space[2.5],
    paddingBottom: theme.space[2.5],
    fontFamily: theme.fonts.code,
    fontSize: "0.75rem",
    lineHeight: 1.6,
    color: theme.color.text.primary.surface,
    selectors: {
      "&:first-child": {
        borderTop: "none",
      },
    },
  },
});

interface LogProps {
  level?: "info" | "error";
  duration?: number;
  start: number;
  message: string;
  entries: string[];
  link: string;
  coldStart?: boolean;
  expanded?: boolean;
  requestId: string;
}
function Log(props: LogProps) {
  const shortDateOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    hour12: false,
    minute: "numeric",
    second: "numeric",
    timeZoneName: "short",
  };
  const longDateOptions: Intl.DateTimeFormatOptions = {
    ...shortDateOptions,
    timeZone: "UTC",
    year: "numeric",
  };
  const shortDate = new Intl.DateTimeFormat("en-US", shortDateOptions)
    .format(props.start)
    .replace(" at ", ", ");
  const longDate = new Intl.DateTimeFormat("en-US", longDateOptions).format(
    props.start
  );

  const formattedDuration =
    props.duration === undefined ? "-" : formatTime(props.duration);

  return (
    <LogContainer expanded={props.expanded} level={props.level}>
      <LogSummary space="1" vertical="center">
        <CaretIcon>
          <IconCaretRight />
        </CaretIcon>
        <LogLevel level={props.level} />
        <LogDate title={longDate}>{shortDate}</LogDate>
        <LogDuration
          coldStart={props.coldStart}
          title={props.coldStart ? "Cold start" : ""}
        >
          {formattedDuration}
        </LogDuration>
        <LogRequestId title="Request Id">{props.requestId}</LogRequestId>
        <LogMessage>{props.message}</LogMessage>
      </LogSummary>
      <Show when={props.expanded}>
        <LogDetail>
          <LogDetailHeader>
            <LogDetailHeaderTitle>Details</LogDetailHeaderTitle>
            <LogLink href={props.link} target="_blank" rel="noreferrer">
              Link
            </LogLink>
          </LogDetailHeader>
          <LogEntries>
            {props.entries.map((entry) => (
              <LogEntry>{entry}</LogEntry>
            ))}
          </LogEntries>
        </LogDetail>
      </Show>
    </LogContainer>
  );
}

const BackButton = styled("button", {
  base: {
    border: "none",
    background: "none",
    color: theme.color.text.dimmed,
    opacity: theme.iconOpacity,
    width: 42,
    height: 42,
    lineHeight: 0,
    padding: `0 ${theme.space[2]} 0 0`,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      "&:hover": {
        color: theme.color.text.secondary,
      },
    },
  },
});

const BackButtonIcon = styled(IconChevronLeft, {
  base: {
    cursor: "pointer",
  },
});

function Back() {
  return (
    <BackButton>
      <BackButtonIcon />
    </BackButton>
  );
}

const LogsHeaderTitle = styled("h1", {
  base: {
    fontSize: "1.25rem",
    fontWeight: 500,
  },
});

const ConstructIcon = styled("div", {
  base: {
    flex: "0 0 auto",
    color: theme.color.icon.secondary,
    width: 13,
    height: 13,
  },
});

const ConstructName = styled("div", {
  base: {
    fontSize: "0.8125rem",
    color: theme.color.text.secondary,
  },
});

const EventRoute = styled("div", {
  base: {
    fontSize: "0.75rem",
    color: theme.color.text.secondary,
    fontFamily: theme.fonts.code,
  },
});

interface LogsHeaderProps {
  handler: string;
  construct: string;
  constructName: string;
  event: string;
  route?: string;
}
function LogsHeader(props: LogsHeaderProps) {
  return (
    <Row space="0" vertical="center">
      <Back />
      <Stack space="2">
        <LogsHeaderTitle>{props.handler}</LogsHeaderTitle>
        <Row space="3.5" vertical="center">
          <Tag style="outline">{props.event}</Tag>
          <Row title={props.construct} space="1.5" vertical="center">
            <ConstructIcon>
              <IconEventBus />
            </ConstructIcon>
            <ConstructName>{props.constructName}</ConstructName>
          </Row>
          <EventRoute>{props.route}</EventRoute>
        </Row>
      </Stack>
    </Row>
  );
}

const LogsEmptyContainer = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 300,
    borderRadius: theme.borderRadius,
    border: `1px solid ${theme.color.divider.base}`,
  },
});

function LogsEmptyLoadingIndicator() {
  return (
    <LogsEmptyContainer>
      <LogLoadingIndicator space="1.5" vertical="center">
        <LogLoadingIndicatorIcon>
          <IconBoltSolid />
        </LogLoadingIndicatorIcon>
        <LogLoadingIndicatorCopy>Tailing logs&hellip;</LogLoadingIndicatorCopy>
      </LogLoadingIndicator>
    </LogsEmptyContainer>
  );
}
