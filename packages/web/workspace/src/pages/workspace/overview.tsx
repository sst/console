import { AppStore } from "$/data/app";
import { AccountStore } from "$/data/aws";
import { StageStore } from "$/data/stage";
import { createSubscription } from "$/providers/replicache";
import { Button, Row, Stack, Tag, Text, theme, utility } from "$/ui";
import { Fullscreen } from "$/ui/layout";
import { IconPlus } from "$/ui/icons";
import { Syncing } from "$/ui/loader";
import { IconApp, IconArrowPathSpin } from "$/ui/icons/custom";
import type { Stage } from "@console/core/app";
import { styled } from "@macaron-css/solid";
import { Link, useNavigate, useSearchParams } from "@solidjs/router";
import { For, Match, Show, Switch, createEffect, createMemo } from "solid-js";
import { Header } from "./header";

const Root = styled("div", {
  base: {
    padding: theme.space[4],
  },
});

const List = styled("div", {
  base: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    alignItems: "start",
    gap: theme.space[4],
  },
});

const Card = styled("div", {
  base: {
    borderRadius: theme.borderRadius,
    border: `1px solid ${theme.color.divider.base}`,
  },
});

const CardEmpty = styled("div", {
  base: {
    padding: theme.space[4],
    borderRadius: theme.borderRadius,
    border: `2px dashed ${theme.color.divider.base}`,
  },
});

const CardEmptyIcon = styled("div", {
  base: {
    width: 16,
    height: 16,
    color: theme.color.icon.dimmed,
  },
});

const CardHeader = styled("div", {
  base: {
    ...utility.row(0.5),
    alignItems: "center",
    padding: theme.space[4],
    borderBottom: `1px solid ${theme.color.divider.base}`,
  },
});

const CardLoading = styled("div", {
  base: {
    ...utility.row(2),
    alignItems: "center",
    padding: theme.space[4],
    borderTop: `1px solid ${theme.color.divider.base}`,
    selectors: {
      "&:first-child": {
        borderTop: "none",
      },
    },
  },
});

const CardLoadingIcon = styled("div", {
  base: {
    width: 16,
    height: 16,
    color: theme.color.icon.dimmed,
  },
});

export function Overview() {
  const accounts = createSubscription(AccountStore.list);
  const stages = createSubscription(StageStore.list, []);
  const [query] = useSearchParams();
  const nav = useNavigate();

  createEffect(() => {
    const all = accounts();
    if (all && !all.length && !query.force)
      nav("account", {
        replace: true,
      });
  });

  return (
    <>
      <Header />
      <Root>
        <Switch>
          <Match when={accounts() && accounts()?.length === 0}>
            <Fullscreen>
              <Syncing>
                <Stack space="2.5">
                  <Text center size="lg" color="secondary">
                    Waiting to connect to your AWS account&hellip;
                  </Text>
                  <Text center size="sm" color="secondary">
                    Haven't connected one yet?{" "}
                    <Link href="account">Head over here.</Link>
                  </Text>
                </Stack>
              </Syncing>
            </Fullscreen>
          </Match>
          <Match when={true}>
            <Stack space="4">
              <Row vertical="center" horizontal="between">
                <Text size="lg" weight="medium">
                  Overview
                </Text>
                <Link href="account">
                  <Button color="secondary">Add AWS Account</Button>
                </Link>
              </Row>
              <List>
                <For each={accounts() || []}>
                  {(account) => {
                    const children = createMemo(() =>
                      stages().filter(
                        (stage) => stage.awsAccountID === account.id
                      )
                    );
                    return (
                      <Card>
                        <CardHeader>
                          <Text code size="mono_sm" color="dimmed">
                            ID:
                          </Text>
                          <Text code size="mono_sm" color="dimmed">
                            {account.accountID}
                          </Text>
                        </CardHeader>
                        <div>
                          <For
                            each={children().sort((a, b) =>
                              a.appID.localeCompare(b.appID)
                            )}
                          >
                            {(stage) => <StageCard stage={stage} />}
                          </For>
                          <Show when={children().length === 0}>
                            <CardLoading>
                              <CardLoadingIcon>
                                <IconArrowPathSpin />
                              </CardLoadingIcon>
                              <Text size="sm" color="dimmed">
                                Seaching for SST apps&hellip;
                              </Text>
                            </CardLoading>
                          </Show>
                        </div>
                      </Card>
                    );
                  }}
                </For>
                <Show when={(accounts() || []).length === 1}>
                  <CardEmpty>
                    <Link href="account">
                      <Row space="2" vertical="center">
                        <CardEmptyIcon>
                          <IconPlus />
                        </CardEmptyIcon>
                        <Text leading="normal" size="sm" color="dimmed">
                          Let's connect another AWS account
                        </Text>
                      </Row>
                    </Link>
                  </CardEmpty>
                </Show>
              </List>
            </Stack>
          </Match>
        </Switch>
      </Root>
    </>
  );
}

const StageRoot = styled(Link, {
  base: {
    ...utility.row(2),
    alignItems: "center",
    padding: theme.space[4],
    justifyContent: "space-between",
    borderTop: `1px solid ${theme.color.divider.base}`,
    transition: `background-color ${theme.colorFadeDuration} ease`,
    ":hover": {
      backgroundColor: theme.color.background.hover,
    },
    selectors: {
      "&:first-child": {
        borderTop: "none",
      },
    },
  },
});

const StageIcon = styled("div", {
  base: {
    flex: "0 0 auto",
    width: 16,
    height: 16,
    color: theme.color.icon.secondary,
  },
});

interface StageCardProps {
  stage: Stage.Info;
}
function StageCard(props: StageCardProps) {
  const app = createSubscription(() => AppStore.fromID(props.stage.appID));
  return (
    <StageRoot href={`${app()?.name}/${props.stage.name}`}>
      <Row space="2" vertical="center">
        <StageIcon>
          <IconApp />
        </StageIcon>
        <Row space="1" vertical="center">
          <Text line size="base" weight="medium" leading="normal">
            {app()?.name}
          </Text>
          <Text size="base" color="dimmed">
            /
          </Text>
          <Text line size="base" weight="medium" leading="normal">
            {props.stage.name}
          </Text>
        </Row>
      </Row>
      <Tag style="outline">{props.stage.region}</Tag>
    </StageRoot>
  );
}
