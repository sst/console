import sst from "./sst.png";
import patrick from "./patrick.jpg";
import { styled } from "@macaron-css/solid";
import {
  IconChevronUpDown,
  IconClipboard,
  IconGlobeAmericas,
} from "$/ui/icons";
import { createSubscription } from "$/data/replicache";
import { useParams } from "@solidjs/router";
import { StageStore } from "$/data/stage";
import { AppStore } from "$/data/app";
import { theme } from "$/ui/theme";
import { Row, Stack } from "$/ui/layout";
import { utility } from "$/ui/utility";
import {
  IconAPI,
  IconNext,
  IconNodeRuntime,
  IconPythonRuntime,
} from "$/ui/icons/custom";
import { For, Match, Switch } from "solid-js";
import { ResourceStore } from "$/data/resource";

const Content = styled("div", {
  base: {
    padding: theme.contentPadding,
    ...utility.stack(4),
  },
});

const Header = styled("div", {
  base: {
    top: "0",
    position: "sticky",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    zIndex: "10",
    borderBottom: `1px solid ${theme.color.divider.base}`,
    padding: theme.space[3],
  },
});

const User = styled("a", {
  base: {
    color: theme.color.text.secondary,
    flexShrink: 0,
    cursor: "pointer",
    fontSize: "0.875rem",
    opacity: "0.8",
    transition: `opacity ${theme.colorFadeDuration} ease-out`,
    ":hover": {
      opacity: "1",
      textDecoration: "none",
    },
  },
});

const UserImage = styled("img", {
  base: {
    borderRadius: "50%",
    backgroundColor: theme.color.background.surface,
    width: 28,
  },
});

const OrgSwitcher = styled("img", {
  base: {
    width: 32,
    height: 32,
    flexShrink: 0,
    padding: 0,
    border: "none",
    borderRadius: "4px",
    backgroundColor: "transparent",
    transition: `border ${theme.colorFadeDuration} ease-out`,
  },
});

const StageSwitcher = styled("div", {
  base: {
    flexShrink: 0,
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    borderLeft: `1px solid ${theme.color.divider.base}`,
    paddingLeft: theme.space[3],
    gap: theme.space[3],
    font: theme.fonts.heading,
    color: theme.color.text.secondary,
  },
});

const SwitcherApp = styled("div", {
  base: {
    fontWeight: "500",
  },
});
const SwitcherStage = styled("div", {
  base: {
    fontSize: "0.875rem",
    color: theme.color.text.dimmed,
  },
});

const SwitcherIcon = styled(IconChevronUpDown, {
  base: {
    color: theme.color.text.dimmed,
    width: 20,
    height: 20,
  },
});

const Resource = styled("div", {
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

const ResourceHeader = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${theme.space[3]} ${theme.space[3]}`,
    borderBottom: `1px solid ${theme.color.divider.surface}`,
  },
});

const ResourceName = styled("div", {
  base: {
    fontWeight: "500",
    fontFamily: theme.fonts.body,
    fontSize: "0.875rem",
  },
});

const ResourceDescription = styled("div", {
  base: {
    fontWeight: "400",
    fontSize: "0.8125rem",
    color: theme.color.text.secondary,
  },
});

const ResourceType = styled("div", {
  base: {
    fontSize: "0.8125rem",
    fontWeight: "400",
    color: theme.color.text.secondary,
  },
});

const ResourceChildren = styled("div", {
  base: {
    ...utility.stack(0),
    padding: `0 ${theme.space[3]}`,
  },
});

const ResourceChild = styled("div", {
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

const ResourceChildTitle = styled("span", {
  base: {
    fontSize: "0.875rem",
  },
});

const ResourceChildDetail = styled("span", {
  base: {
    color: theme.color.text.secondary,
    fontSize: "0.8125rem",
    fontFamily: theme.fonts.code,
    textOverflow: "ellipsis",
    textAlign: "right",
    overflow: "hidden",
  },
});
const ResourceChildExtra = styled("span", {
  base: {
    color: theme.color.text.dimmed,
    fontSize: "0.625rem",
    textTransform: "uppercase",
    fontFamily: theme.fonts.code,
  },
});

const ResourceChildIcon = styled("div", {
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

const ResourceChildTag = styled("div", {
  base: {
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

export function Single() {
  const params = useParams();
  const stage = createSubscription(() => StageStore.fromID(params.stageID));
  const app = createSubscription(() => AppStore.fromID(params.appID));
  const resources = createSubscription(
    () => ResourceStore.forStage(params.stageID),
    []
  );

  return (
    <>
      <Header>
        <Row space="4">
          <OrgSwitcher src={sst} />
          <StageSwitcher>
            <Stack space="1">
              <SwitcherApp>{app()?.name}</SwitcherApp>
              <SwitcherStage>{stage()?.name}</SwitcherStage>
            </Stack>
            <SwitcherIcon />
          </StageSwitcher>
        </Row>
        <User>
          <UserImage src={patrick} />
        </User>
      </Header>
      <Content>
        <Resource>
          <ResourceHeader>
            <Row space="2" vertical="center">
              <IconNext width={16} />
              <ResourceName>site</ResourceName>
              <ResourceDescription>my-sst-app.com</ResourceDescription>
            </Row>
            <ResourceType>NextjsSite</ResourceType>
          </ResourceHeader>
          <ResourceChildren>
            <ResourceChild>
              <Row space="2" vertical="center">
                <a>
                  <ResourceChildTitle>Server Function</ResourceChildTitle>
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
            <ResourceChild>
              <Row space="2" vertical="center">
                <a>
                  <ResourceChildTitle>Image Function</ResourceChildTitle>
                </a>
              </Row>
              <Row space="3" vertical="center">
                <ResourceChildDetail>34.8 MB</ResourceChildDetail>
                <ResourceChildIcon>
                  <IconPythonRuntime />
                </ResourceChildIcon>
                <ResourceChildExtra>us-east-1</ResourceChildExtra>
              </Row>
            </ResourceChild>
          </ResourceChildren>
        </Resource>
        <Resource>
          <ResourceHeader>
            <Row space="2" vertical="center">
              <IconAPI width={16} />
              <ResourceName>api</ResourceName>
              <ResourceDescription>api.my-sst-app.com</ResourceDescription>
            </Row>
            <ResourceType>Api</ResourceType>
          </ResourceHeader>
          <ResourceChildren>
            <ResourceChild>
              <Row space="2" vertical="center">
                <ResourceChildTag>GET</ResourceChildTag>
                <a>
                  <ResourceChildTitle>/notes</ResourceChildTitle>
                </a>
              </Row>
              <Row space="3" vertical="center">
                <ResourceChildDetail>3.4 MB</ResourceChildDetail>
                <ResourceChildIcon>
                  <IconNodeRuntime />
                </ResourceChildIcon>
                <ResourceChildExtra>us-east-1</ResourceChildExtra>
              </Row>
            </ResourceChild>
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
          </ResourceChildren>
        </Resource>

        <Resource type="outputs">
          <ResourceHeader>
            <Row space="2" vertical="center">
              <ResourceName>Outputs</ResourceName>
            </Row>
          </ResourceHeader>
          <ResourceChildren>
            <For
              each={[
                [
                  "ApiEndpoint",
                  "https://mwismf5e9l.execute-api.us-east-1.amazonaws.com/prod",
                ],
                [
                  "ServerlessDeploymentBucketName",
                  "mono-repo-sls-groups-pro-serverlessdeploymentbuck-1kmkojwrhblsj",
                ],
                [
                  "HelloLambdaFunctionQualifiedArn",
                  "arn:aws:lambda:us-east-1:087220554750:function:mono-repo-sls-groups-prod-hello:3",
                ],
              ]}
            >
              {([key, value]) => (
                <ResourceChild>
                  <ResourceChildTitle>{key}</ResourceChildTitle>
                  <Row vertical="center" space="2">
                    <ResourceChildDetail>{value}</ResourceChildDetail>
                    <ResourceChildIcon>
                      <IconClipboard />
                    </ResourceChildIcon>
                  </Row>
                </ResourceChild>
              )}
            </For>
          </ResourceChildren>
        </Resource>

        <For
          each={resources().filter(
            (r) => r.type === "Api" || r.type === "StaticSite"
          )}
        >
          {(resource) => (
            <Resource>
              <ResourceHeader>
                <Row space="2" vertical="center">
                  <Switch>
                    <Match when={resource.type === "Api"}>
                      <IconAPI width={16} />
                    </Match>
                    <Match when={resource.type === "StaticSite"}>
                      <IconGlobeAmericas width={16} />
                    </Match>
                  </Switch>
                  <ResourceName>{resource.cfnID}</ResourceName>
                  <ResourceDescription>
                    <Switch>
                      <Match when={resource.type === "Api" && resource}>
                        {(resource) =>
                          resource().metadata.customDomainUrl ||
                          resource().metadata.url
                        }
                      </Match>
                      <Match when={resource.type === "StaticSite" && resource}>
                        {(resource) =>
                          resource().metadata.customDomainUrl ||
                          resource().metadata.path
                        }
                      </Match>
                    </Switch>
                  </ResourceDescription>
                </Row>
              </ResourceHeader>
            </Resource>
          )}
        </For>
      </Content>
    </>
  );
}
