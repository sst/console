import { Row } from "$/ui/layout";
import { styled } from "@macaron-css/solid";
import { theme } from "$/ui/theme";
import { IconClipboard } from "$/ui/icons";
import { IconNodeRuntime } from "$/ui/icons/custom";
import {
  ResourceChild,
  ResourceChildDetail,
  ResourceChildExtra,
  ResourceChildIcon,
  ResourceChildTag,
  ResourceChildTitle,
  ResourceChildTitleLink,
} from "$/pages//workspace/stage";

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
            <ResourceChild>
              <Row space="2" vertical="center">
                <ResourceChildTag>OPTIONS</ResourceChildTag>
                <ResourceChildTitleLink>/notes/settings</ResourceChildTitleLink>
              </Row>
              <Row shrink={false} space="3" vertical="center">
                <ResourceChildDetail>11.2 MB</ResourceChildDetail>
                <ResourceChildIcon>
                  <IconNodeRuntime />
                </ResourceChildIcon>
                <ResourceChildExtra>us-east-1</ResourceChildExtra>
              </Row>
            </ResourceChild>
          </VariantContent>
        </Variant>
        <Variant>
          <VariantName>Overflow</VariantName>
          <VariantContent>
            <ResourceChild>
              <Row space="2" vertical="center">
                <ResourceChildTag>OPTIONS</ResourceChildTag>
                <ResourceChildTitleLink>
                  /notes/settings/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long
                </ResourceChildTitleLink>
              </Row>
              <Row shrink={false} space="3" vertical="center">
                <ResourceChildDetail>11.2 MB</ResourceChildDetail>
                <ResourceChildIcon>
                  <IconNodeRuntime />
                </ResourceChildIcon>
                <ResourceChildExtra>us-east-1</ResourceChildExtra>
              </Row>
            </ResourceChild>
          </VariantContent>
        </Variant>
      </Component>
      <Component>
        <ComponentName>Outputs</ComponentName>
        <Variant>
          <VariantName>Default</VariantName>
          <VariantContent>
            <ResourceChild>
              <Row shrink={false}>
                <ResourceChildTitle>ApiEndpoint</ResourceChildTitle>
              </Row>
              <Row vertical="center" space="2">
                <ResourceChildDetail>
                  https://mwismf5e9l.execute-api.us-east-1.amazonaws.com/prod
                </ResourceChildDetail>
                <ResourceChildIcon>
                  <IconClipboard />
                </ResourceChildIcon>
              </Row>
            </ResourceChild>
          </VariantContent>
        </Variant>
        <Variant>
          <VariantName>Overflow</VariantName>
          <VariantContent>
            <ResourceChild>
              <Row shrink={false}>
                <ResourceChildTitle>ApiEndpoint</ResourceChildTitle>
              </Row>
              <Row vertical="center" space="2">
                <ResourceChildDetail>
                  https://mwismf5e9l.execute-api.us-east-1.amazonaws.com/prod/with/an/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long
                </ResourceChildDetail>
                <ResourceChildIcon>
                  <IconClipboard />
                </ResourceChildIcon>
              </Row>
            </ResourceChild>
          </VariantContent>
        </Variant>
      </Component>
    </>
  );
}
