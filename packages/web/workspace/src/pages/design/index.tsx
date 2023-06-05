import { Row } from "$/ui/layout";
import { styled } from "@macaron-css/solid";
import { theme } from "$/ui/theme";
import { IconClipboard } from "$/ui/icons";
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

const Component = styled("div", {
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

const Variant = styled("div", {
  base: {
    marginBottom: theme.space[4],
  },
});

const VariantName = styled("h2", {
  base: {
    fontSize: "0.8125rem",
    textTransform: "uppercase",
    paddingBottom: theme.space[4],
    fontFamily: theme.fonts.heading,
  },
});

const VariantContent = styled("div", {
  base: {
    border: `1px solid ${theme.color.divider.base}`,
    padding: theme.space[4],
    borderRadius: theme.borderRadius,
  },
});

export function Design() {
  return (
    <>
      <Component>
        <ComponentName>Resources</ComponentName>
        <Variant>
          <VariantName>Default</VariantName>
          <VariantContent>
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
          </VariantContent>
        </Variant>
        <Variant>
          <VariantName>Overflow</VariantName>
          <VariantContent>
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
          </VariantContent>
        </Variant>
      </Component>
      <Component>
        <ComponentName>Outputs</ComponentName>
        <Variant>
          <VariantName>Default</VariantName>
          <VariantContent>
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
          </VariantContent>
        </Variant>
        <Variant>
          <VariantName>Overflow</VariantName>
          <VariantContent>
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
          </VariantContent>
        </Variant>
      </Component>
    </>
  );
}
