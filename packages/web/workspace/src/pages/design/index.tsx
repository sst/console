import { Row, Stack } from "$/ui/layout";
import { styled } from "@macaron-css/solid";
import { theme } from "$/ui/theme";
import { IconClipboard } from "$/ui/icons";
import {
  IconAPI,
  IconNext,
  IconNodeRuntime,
  IconPythonRuntime,
} from "$/ui/icons/custom";
import {
  ResourceChild,
  ResourceChildDetail,
  ResourceChildExtra,
  ResourceChildIcon,
  ResourceChildTag,
  ResourceChildTitle,
} from "../workspace/apps/stages/single";

const Component = styled("div", {
  base: {
    padding: theme.space[4],
  },
});

const ComponentName = styled("h1", {
  base: {
    fontSize: "1.25rem",
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
    fontSize: "1rem",
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
                <a>
                  <ResourceChildTitle>/notes/settings</ResourceChildTitle>
                </a>
              </Row>
              <Row space="3" vertical="center">
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
                <a href="/">
                  <ResourceChildTitle>
                    /notes/settings/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long
                  </ResourceChildTitle>
                </a>
              </Row>
              <Row space="3" vertical="center">
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
              <ResourceChildTitle>ApiEndpoint</ResourceChildTitle>
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
              <ResourceChildTitle>ApiEndpoint</ResourceChildTitle>
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
