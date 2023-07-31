import { AppStore } from "$/data/app";
import { UserStore } from "$/data/user";
import { AccountStore } from "$/data/aws";
import { StageStore } from "$/data/stage";
import { useAuth } from "$/providers/auth";
import { useStorage } from "$/providers/account";
import { createSubscription } from "$/providers/replicache";
import {
  Button,
  Row,
  Stack,
  Tag,
  Text,
  IconButton,
  theme,
  utility,
} from "$/ui";
import { Fullscreen } from "$/ui/layout";
import { IconPlus, IconUserMinus } from "$/ui/icons";
import { AvatarInitialsIcon } from "$/ui/avatar-icon";
import { Syncing } from "$/ui/loader";
import { IconApp, IconArrowPathSpin } from "$/ui/icons/custom";
import type { App } from "@console/core/app";
import type { Stage } from "@console/core/app";
import type { Account } from "@console/core/aws/account";
import { styled } from "@macaron-css/solid";
import { Link, useNavigate, useSearchParams } from "@solidjs/router";
import {
  DUMMY_STAGES,
  DUMMY_ACCOUNTS,
  DUMMY_LOCAL_APP,
  DUMMY_APP_STORE,
} from "./overview-dummy";
import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  useContext,
  ComponentProps,
} from "solid-js";
import { Header } from "./header";
import { useLocalContext } from "$/providers/local";

const Root = styled("div", {
  base: {
    padding: theme.space[4],
  },
});

const Col = styled("div", {
  base: {
    ...utility.stack(4),
    width: "50%",
  },
});

const Card = styled("div", {
  base: {
    borderRadius: theme.borderRadius,
    border: `1px solid ${theme.color.divider.base}`,
  },
});

const CardHeader = styled("div", {
  base: {
    ...utility.row(0.5),
    height: 46,
    alignItems: "center",
    justifyContent: "space-between",
    padding: `0 ${theme.space[4]}`,
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

function splitCols(array: Account.Info[]) {
  if (array.length === 0) {
    return [[], []];
  } else if (array.length === 1) {
    return [array, []];
  }

  const newArray = [...array];
  // Insert second element twice as a placeholder for the user's card
  newArray.splice(2, 0, newArray[1]);

  var col1 = [];
  var col2 = [];

  for (var i = 0; i < newArray.length; i++) {
    if (i % 2 === 0) {
      col1.push(newArray[i]);
    } else {
      col2.push(newArray[i]);
    }
  }

  // Remove the duplicate element
  return [col1, col2.slice(1)];
}

export function Overview() {
  const [query] = useSearchParams();
  const accounts = createSubscription(
    () =>
      query.dummy
        ? async (): Promise<Account.Info[]> => {
            return DUMMY_ACCOUNTS.hasOwnProperty(query.dummy)
              ? DUMMY_ACCOUNTS[query.dummy as keyof typeof DUMMY_ACCOUNTS]
              : DUMMY_ACCOUNTS.DEFAULT;
          }
        : AccountStore.list(),
    []
  );
  const users = createSubscription(UserStore.list, []);
  const cols = createMemo(() => splitCols(accounts()));
  const stages = createSubscription(
    () =>
      query.dummy
        ? async (): Promise<Stage.Info[]> => DUMMY_STAGES
        : StageStore.list(),
    []
  );
  const nav = useNavigate();

  createEffect(() => {
    const all = accounts();
    if (all && !all.length && !query.force && !query.dummy)
      nav("account", {
        replace: true,
      });
  });

  function renderAccount(account: Account.Info) {
    const children = createMemo(() =>
      stages().filter((stage) => stage.awsAccountID === account.id)
    );
    return (
      <Card>
        <CardHeader>
          <Row space="0.5">
            <Text code size="mono_sm" color="dimmed">
              ID:
            </Text>
            <Text code size="mono_sm" color="dimmed">
              {account.accountID}
            </Text>
          </Row>
          <Show when={account.timeFailed}>
            <Link href="account">
              <Tag level="danger">Disconnected</Tag>
            </Link>
          </Show>
        </CardHeader>
        <div>
          <For each={children().sort((a, b) => a.appID.localeCompare(b.appID))}>
            {(stage) => <StageCard stage={stage} />}
          </For>
          <Show when={children().length === 0}>
            <CardLoading>
              <CardLoadingIcon>
                <IconArrowPathSpin />
              </CardLoadingIcon>
              <Text size="sm" color="dimmed">
                Searching for SST apps&hellip;
              </Text>
            </CardLoading>
          </Show>
        </div>
      </Card>
    );
  }

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
              <Row space="5" vertical="center" horizontal="between">
                <Text size="lg" weight="medium">
                  Overview
                </Text>
                <Row space="4" vertical="center">
                  <Link href="account">
                    <Button color="secondary">Add AWS Account</Button>
                  </Link>
                  <Link href="user">
                    <Button color="primary">Invite Team</Button>
                  </Link>
                </Row>
              </Row>
              <Row space="4">
                <Col>
                  <For each={cols()[0]}>{renderAccount}</For>
                </Col>
                <Col>
                  <Card>
                    <CardHeader>
                      <Text code size="mono_sm" color="dimmed">
                        Team: {users().length}
                      </Text>
                    </CardHeader>
                    <div>
                      <For each={users()}>
                        {(user) => {
                          const auth = useAuth();
                          const storage = useStorage();
                          const currentUser = createMemo(
                            () => auth[storage.value.account].token
                          );
                          return (
                            <Show when={user.timeDeleted === null}>
                              <UserCard
                                email={user.email}
                                status="active"
                                self={currentUser().email === user.email}
                              />
                            </Show>
                          );
                        }}
                      </For>
                    </div>
                  </Card>
                  <For each={cols()[1]}>{renderAccount}</For>
                </Col>
              </Row>
            </Stack>
          </Match>
        </Switch>
      </Root>
    </>
  );
}

const StageRoot = styled(Link, {
  base: {
    ...utility.row(3),
    height: 58,
    alignItems: "center",
    padding: `0 ${theme.space[4]}`,
    justifyContent: "space-between",
    borderTop: `1px solid ${theme.color.divider.base}`,
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

const StageCardTags = styled("div", {
  base: {
    ...utility.row(3),
    alignItems: "center",
    flex: "0 0 auto",
  },
});

interface StageCardProps {
  stage: Stage.Info;
}
function StageCard(props: StageCardProps) {
  const [query] = useSearchParams();
  const app = createSubscription(() =>
    query.dummy
      ? async (): Promise<App.Info> => DUMMY_APP_STORE[props.stage.appID]
      : AppStore.fromID(props.stage.appID)
  );
  const local = query.dummy ? () => DUMMY_LOCAL_APP : useLocalContext();
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
      <StageCardTags>
        <Show
          when={
            props.stage.name === local()?.stage && app()?.name === local()?.app
          }
        >
          <Tag level="tip" style="outline">
            Local
          </Tag>
        </Show>
        <Tag style="outline">{props.stage.region}</Tag>
      </StageCardTags>
    </StageRoot>
  );
}

const UserRoot = styled("div", {
  base: {
    ...utility.row(3),
    height: 58,
    alignItems: "center",
    padding: `0 ${theme.space[4]}`,
    justifyContent: "space-between",
    borderTop: `1px solid ${theme.color.divider.base}`,
    selectors: {
      "&:first-child": {
        borderTop: "none",
      },
    },
  },
});

type UserCardProps = ComponentProps<typeof UserRoot> & {
  self?: boolean;
  email: string;
  status: "invited" | "active";
};

function UserCard(props: UserCardProps) {
  return (
    <UserRoot>
      <Row space="2" vertical="center">
        <AvatarInitialsIcon
          type="user"
          text={props.email}
          style={{ width: "24px", height: "24px" }}
        />
        <Text line size="base" leading="normal">
          {props.email}
        </Text>
      </Row>
      <Row space="3" horizontal="center" style={{ flex: "0 0 auto" }}>
        <Show when={props.status === "invited"}>
          <Tag level="tip">Invited</Tag>
        </Show>
        {/*<Show when={!props.self}>*/}
        <Show when={false}>
          <IconButton
            title="Remove from workspace"
            onClick={() =>
              window.confirm(
                "Are you sure you want to remove them from the workspace?"
              )
            }
          >
            <IconUserMinus
              width={18}
              height={18}
              style={{ display: "block" }}
            />
          </IconButton>
        </Show>
      </Row>
    </UserRoot>
  );
}
