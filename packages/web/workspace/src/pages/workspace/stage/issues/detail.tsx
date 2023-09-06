import { theme } from "$/ui/theme";
import { Link } from "@solidjs/router";
import { PageHeader } from "../resources";
import { styled } from "@macaron-css/solid";
import { JSX, Show, Switch, Match, ComponentProps } from "solid-js";
import { IconCheck, IconNoSymbol, IconViewfinderCircle } from "$/ui/icons";
import {
  utility,
  Tag,
  Row,
  Stack,
  TabTitle,
  Text,
  Button,
  ButtonGroup,
} from "$/ui";
import { formatNumber, formatSinceTime } from "$/common/format";

const Content = styled("div", {
  base: {
    flex: "1 1 auto",
  },
});

const Sidebar = styled("div", {
  base: {
    flex: "0 0 auto",
    width: 300,
  },
});

const StackTraceMock = styled("div", {
  base: {
    backgroundColor: theme.color.background.surface,
    borderRadius: theme.borderRadius,
    height: 300,
  },
});

const LogsMock = styled("div", {
  base: {
    backgroundColor: theme.color.background.surface,
    borderRadius: theme.borderRadius,
    padding: `0 ${theme.space[5]}`,
  },
});

const LogsMockRow = styled("div", {
  base: {
    borderTop: `1px solid ${theme.color.divider.surface}`,
    height: 50,
    ":first-child": {
      borderTop: "none",
    },
  },
});

const FunctionLink = styled(Link, {
  base: {
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_sm,
    lineHeight: theme.font.lineHeight,
  },
});

const ButtonIcon = styled("span", {
  base: {
    width: 14,
    height: 14,
    marginRight: 6,
    verticalAlign: -2,
    display: "inline-block",
    opacity: theme.iconOpacity,
  },
});

type LabelProps = ComponentProps<typeof Text> & {};

function Label(props: LabelProps) {
  return (
    <Text
      code
      uppercase
      on="surface"
      size="mono_sm"
      weight="medium"
      color="dimmed"
      {...props}
    >
      {props.children}
    </Text>
  );
}

export function Issue() {
  const status: "ignored" | "resolved" | "active" = "resolved";
  return (
    <>
      <PageHeader>
        <Link href="../../">
          <TabTitle state="inactive">Resources</TabTitle>
        </Link>
        <Link href="../">
          <TabTitle count="99+" state="active">
            Issues
          </TabTitle>
        </Link>
      </PageHeader>
      <Row space="6" style={{ padding: `${theme.space[4]}` }}>
        <Content>
          <Stack space="7">
            <Stack space="2">
              <Text code size="mono_2xl" weight="medium">
                NoSuchBucket
              </Text>
              <Stack space="0">
                <Text code leading="loose" size="mono_base">
                  The specified bucket does not exist.
                </Text>
                <FunctionLink href="/link/to/logs">
                  /packages/functions/src/events/log-poller-status.handler
                </FunctionLink>
              </Stack>
            </Stack>
            <Stack space="2">
              <Label>Stack Trace</Label>
              <StackTraceMock></StackTraceMock>
            </Stack>
            <Stack space="2">
              <Label>Logs</Label>
              <LogsMock>
                <LogsMockRow />
                <LogsMockRow />
                <LogsMockRow />
                <LogsMockRow />
              </LogsMock>
            </Stack>
          </Stack>
        </Content>
        <Sidebar>
          <Stack space="7">
            <ButtonGroup>
              <Button
                grouped="left"
                color="secondary"
                style={{ flex: "1 1 auto" }}
              >
                <ButtonIcon>
                  <IconNoSymbol />
                </ButtonIcon>
                Ignore
              </Button>
              <Button
                data-state-active
                grouped="right"
                color="secondary"
                style={{ flex: "1 1 auto" }}
              >
                <ButtonIcon>
                  <IconCheck />
                </ButtonIcon>
                Resolve
              </Button>
            </ButtonGroup>
            <Stack space="2">
              <Label>Status</Label>
              <Row>
                <Switch>
                  <Match when={status === "active"}>
                    <Tag level="caution">Active</Tag>
                  </Match>
                  <Match when={status === "ignored"}>
                    <Tag level="info">Ignored</Tag>
                  </Match>
                  <Match when={status === "resolved"}>
                    <Tag level="tip">Resolved</Tag>
                  </Match>
                </Switch>
              </Row>
            </Stack>
            <Stack space="2">
              <Label>Last Seen</Label>
              <Text
                title={new Date(
                  new Date().getTime() - 1000 * 60 * 24 * 2
                ).toUTCString()}
                color="secondary"
              >
                {formatSinceTime(
                  new Date().getTime() - 1000 * 60 * 24 * 2,
                  true
                )}
              </Text>
            </Stack>
            <Stack space="2">
              <Label>First Seen</Label>
              <Text
                title={new Date(1620000000000).toUTCString()}
                color="secondary"
              >
                {formatSinceTime(1620000000000, true)}
              </Text>
            </Stack>
            <Stack space="2">
              <Label>Events in last 24hrs</Label>
              <Text color="secondary" title={(7321).toString()}>
                {formatNumber(7321, true)}
              </Text>
            </Stack>
          </Stack>
        </Sidebar>
      </Row>
    </>
  );
}
