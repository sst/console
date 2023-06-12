import { Row } from "$/ui/layout";
import { styled } from "@macaron-css/solid";
import { theme } from "$/ui/theme";
import { IconClipboard } from "$/ui/icons";
import { Button } from "$/ui/button";
import { IconNodeRuntime } from "$/ui/icons/custom";
import {
  Child,
  ChildDetail,
  ChildExtra,
  ChildIcon,
  ChildTag,
  ChildTitle,
  ChildTitleLink,
} from "$/pages//workspace/stage/resources";
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
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
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
          <Row space="2" vertical="center">
            <span>Label</span>
            <span>Value</span>
          </Row>
        </Variant>
        <Variant name="Overflow">
          <Row space="2" vertical="center">
            <span>Label</span>
            <OverflowSpan>
              /notes/settings/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long
            </OverflowSpan>
          </Row>
        </Variant>
      </Component>
      <Component name="Resources">
        <Variant name="Default">
          <Child>
            <Row space="2" vertical="center">
              <ChildTag>OPTIONS</ChildTag>
              <ChildTitleLink>/notes/settings</ChildTitleLink>
            </Row>
            <Row shrink={false} space="3" vertical="center">
              <ChildDetail>11.2 MB</ChildDetail>
              <ChildIcon>
                <IconNodeRuntime />
              </ChildIcon>
              <ChildExtra>us-east-1</ChildExtra>
            </Row>
          </Child>
        </Variant>
        <Variant name="Overflow">
          <Child>
            <Row space="2" vertical="center">
              <ChildTag>OPTIONS</ChildTag>
              <ChildTitleLink>
                /notes/settings/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long
              </ChildTitleLink>
            </Row>
            <Row shrink={false} space="3" vertical="center">
              <ChildDetail>11.2 MB</ChildDetail>
              <ChildIcon>
                <IconNodeRuntime />
              </ChildIcon>
              <ChildExtra>us-east-1</ChildExtra>
            </Row>
          </Child>
        </Variant>
      </Component>
      <Component name="Outputs">
        <Variant name="Default">
          <Child>
            <Row shrink={false}>
              <ChildTitle>ApiEndpoint</ChildTitle>
            </Row>
            <Row vertical="center" space="2">
              <ChildDetail>
                https://mwismf5e9l.execute-api.us-east-1.amazonaws.com/prod
              </ChildDetail>
              <ChildIcon>
                <IconClipboard />
              </ChildIcon>
            </Row>
          </Child>
        </Variant>
        <Variant name="Overflow">
          <Child>
            <Row shrink={false}>
              <ChildTitle>ApiEndpoint</ChildTitle>
            </Row>
            <Row vertical="center" space="2">
              <ChildDetail>
                https://mwismf5e9l.execute-api.us-east-1.amazonaws.com/prod/with/an/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long
              </ChildDetail>
              <ChildIcon>
                <IconClipboard />
              </ChildIcon>
            </Row>
          </Child>
        </Variant>
      </Component>
    </>
  );
}
