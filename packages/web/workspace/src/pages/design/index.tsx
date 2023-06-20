import { Row } from "$/ui/layout";
import { styled } from "@macaron-css/solid";
import { theme } from "$/ui/theme";
import { IconClipboard } from "$/ui/icons";
import { Tag } from "$/ui/tag";
import { Button } from "$/ui/button";
import { IconNodeRuntime } from "$/ui/icons/custom";
import { JSX, ComponentProps } from "solid-js";
import { prop } from "remeda";

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
          <Log
            level="info"
            duration={112873.27}
            start={Date.now()}
            message="Hello world"
            link="https://google.com"
            entries={[]}
          />
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

function LogLevel(props: { level?: string }) {
  const level = props.level || "info";
  return <Tag level={level === "error" ? "danger" : "info"}>{level}</Tag>;
}

interface LogProps {
  level?: "info" | "error";
  duration?: number;
  start: number;
  message: string;
  entries: string[];
  link: string;
  coldStart?: boolean;
  expanded?: boolean;
}
function Log(props: LogProps) {
  const shortDateOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  };
  const longDateOptions: Intl.DateTimeFormatOptions = {
    ...shortDateOptions,
    year: "numeric",
    timeZone: "UTC",
    timeZoneName: "short",
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
    <Row space="1">
      <LogLevel level={props.level} />
      <span title={longDate}>{shortDate}</span>
      {formattedDuration}
      {props.coldStart ? "cold" : "warm"}
      {props.link}
      {props.message}
    </Row>
  );
}
