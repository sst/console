import { Row } from "$/ui/layout";
import { styled } from "@macaron-css/solid";
import { theme } from "$/ui/theme";
import { IconClipboard } from "$/ui/icons";
import { Button } from "$/ui/button";
import { IconNodeRuntime } from "$/ui/icons/custom";
import { JSX } from "solid-js";

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

interface ComponentProps {
  name: string;
  children: JSX.Element;
}

interface VariantProps {
  themes?: boolean;
  name: string;
  children: JSX.Element;
}

function Component(props: ComponentProps) {
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
      <Component name="Button">
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
      </Component>
      <Component name="Row">
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
      </Component>
    </>
  );
}
