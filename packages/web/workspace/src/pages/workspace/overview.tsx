import { AppStore } from "$/data/app";
import { UserInfo, UserStore } from "$/data/user";
import { AccountStore } from "$/data/aws";
import { StageStore } from "$/data/stage";
import { PRICING_PLAN, UsageStore } from "$/data/usage";
import { useAuth } from "$/providers/auth";
import { useStorage } from "$/providers/account";
import {
  createGet,
  createSubscription,
  useReplicache,
} from "$/providers/replicache";
import {
  theme,
  utility,
  Row,
  Tag,
  Text,
  Stack,
  Button,
  TextButton,
  LinkButton,
  IconButton,
} from "$/ui";
import { Fullscreen } from "$/ui/layout";
import { Dropdown } from "$/ui/dropdown";
import {
  IconPlus,
  IconChevronRight,
  IconEllipsisVertical,
  IconExclamationTriangle,
} from "$/ui/icons";
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
} from "./overview-dummy";
import { For, Match, Show, Switch, createEffect, createMemo } from "solid-js";
import { Header } from "./header";
import { useLocalContext } from "$/providers/local";
import { pipe, sortBy } from "remeda";
import { User } from "@console/core/user";
import { WorkspaceStore } from "$/data/workspace";
import { useWorkspace } from "./context";

const Root = styled("div", {
  base: {
    padding: theme.space[4],
  },
});

const Announcement = styled("div", {
  base: {
    backgroundColor: theme.color.background.surface,
    padding: theme.space[3],
    textAlign: "center",
  },
});

const AnnouncementLinkIcon = styled("span", {
  base: {
    top: 2,
    paddingLeft: 1,
    position: "relative",
    opacity: theme.iconOpacity,
  },
});

const PageHeader = styled("div", {
  base: {
    ...utility.stack(0),
    height: 40,
    justifyContent: "space-between",
  },
});

const ManageWorkspaceIcon = styled("div", {
  base: {
    top: 2,
    position: "relative",
    opacity: theme.iconOpacity,
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

const CardError = styled("div", {
  base: {
    ...utility.row(2),
    alignItems: "center",
    padding: theme.space[4],
  },
});

const CardErrorIcon = styled("div", {
  base: {
    width: 16,
    height: 16,
    color: `hsla(${theme.color.base.red}, 100%)`,
  },
});

const CardErrorCopy = styled(Text, {
  base: {
    fontSize: theme.font.size.sm,
    color: `hsla(${theme.color.base.red}, 100%)`,
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

function sortUsers(users: UserInfo[], selfEmail: string): UserInfo[] {
  return sortBy(
    users,
    (user) => (user.email === selfEmail ? 0 : 1), // Your own user
    (user) => (!user.timeSeen ? 0 : 1), // Invites
    (user) => user.email.length // Sort by length
  );
}

function splitCols(array: Account.Info[]) {
  if (array.length === 0) {
    return [[], []];
  } else if (array.length === 1) {
    return [array, []];
  }

  var col1 = [];
  var col2 = [];

  for (var i = 0; i < array.length; i++) {
    // Leave an empty slot for the users card
    if (i === 0 || i % 2 !== 0) {
      col1.push(array[i]);
    } else {
      col2.push(array[i]);
    }
  }

  return [col1, col2];
}

export function Overview() {
  const rep = useReplicache();
  const [query] = useSearchParams();
  const accounts = createSubscription(() =>
    query.dummy
      ? async (): Promise<Account.Info[]> => {
          return DUMMY_ACCOUNTS.hasOwnProperty(query.dummy)
            ? DUMMY_ACCOUNTS[query.dummy as keyof typeof DUMMY_ACCOUNTS]
            : DUMMY_ACCOUNTS.DEFAULT;
        }
      : AccountStore.list()
  );
  const users = createSubscription(UserStore.list, [] as User.Info[]);
  const cols = createMemo(() => splitCols(accounts() || []));
  const stages = createSubscription(
    () =>
      query.dummy
        ? async (): Promise<Stage.Info[]> => DUMMY_STAGES
        : StageStore.list(),
    []
  );
  const workspace = useWorkspace();
  const usages = UsageStore.watch.scan(rep);
  const invocations = createMemo(() =>
    usages()
      .map((usage) => usage.invocations)
      .reduce((a, b) => a + b, 0)
  );
  const nav = useNavigate();
  const auth = useAuth();
  const storage = useStorage();
  const selfEmail = createMemo(() => auth[storage.value.account].token.email);

  createEffect(() => {
    const all = accounts();
    if (all && !all.length && !query.force && !query.dummy)
      nav("account", {
        replace: true,
      });
  });

  function renderAccount(account: Account.Info) {
    const apps = AppStore.watch.scan(rep);
    const local = useLocalContext();
    const children = createMemo(() => {
      return sortBy(
        stages().filter((stage) => stage.awsAccountID === account.id),
        (c) => apps().find((app) => app.id === c.appID)?.name || "",
        (c) => c.name
      );
    });
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
        </CardHeader>
        <div>
          <Show when={account.timeFailed}>
            <CardError>
              <CardErrorIcon>
                <IconExclamationTriangle />
              </CardErrorIcon>
              <Link href="account">
                <CardErrorCopy>Reconnect account</CardErrorCopy>
              </Link>
            </CardError>
          </Show>
          <For each={children()}>{(stage) => <StageCard stage={stage} />}</For>
          <Show when={!account.timeDiscovered && !account.timeFailed}>
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
      <Switch>
        <Match when={accounts() && accounts()?.length === 0}>
          <Fullscreen>
            <Syncing>
              <Stack space="3.5">
                <Text center size="xl" color="secondary">
                  Waiting to connect to your AWS account&hellip;
                </Text>
                <Stack space="2">
                  <Text center size="sm" color="secondary">
                    Double-check that the stack was created in <b>us-east-1</b>.
                  </Text>
                  <Text center size="sm" color="secondary">
                    If not, then remove the stack and{" "}
                    <Link href="account">reconnect it here.</Link>
                  </Text>
                </Stack>
              </Stack>
            </Syncing>
          </Fullscreen>
        </Match>
        <Match when={true}>
          <>
            <Announcement>
              <Text
                code
                uppercase
                on="surface"
                size="mono_sm"
                weight="medium"
                color="secondary"
              >
                New
              </Text>
              <Text size="sm" on="surface" color="dimmed">
                {" "}
                —{" "}
              </Text>
              <Text size="sm" on="surface" color="secondary">
                Use a restricted IAM policy and connect your prod AWS accounts.{" "}
                <a
                  href="https://docs.sst.dev/advanced/console-updates#restricted-iam-policy"
                  target="_blank"
                >
                  Learn more
                  <AnnouncementLinkIcon>
                    <IconChevronRight width="13" height="13" />
                  </AnnouncementLinkIcon>
                </a>
              </Text>
            </Announcement>
            <Root>
              <Stack space="4">
                <Row space="5" vertical="center" horizontal="between">
                  <PageHeader>
                    <Text size="lg" weight="medium">
                      Overview
                    </Text>
                    <Link href="settings">
                      <TextButton>
                        <Row space="0.5" horizontal="center">
                          <Show
                            when={
                              invocations() > PRICING_PLAN[0].to &&
                              !workspace().stripeSubscriptionID
                            }
                          >
                            <Text color="danger" size="sm">
                              Your usage is above the free tier, add your
                              billing details
                            </Text>
                          </Show>
                          <Show when={invocations() <= PRICING_PLAN[0].to}>
                            Manage workspace
                          </Show>
                          <ManageWorkspaceIcon>
                            <IconChevronRight width="13" height="13" />
                          </ManageWorkspaceIcon>
                        </Row>
                      </TextButton>
                    </Link>
                  </PageHeader>
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
                        <Row space="0.5">
                          <Text code size="mono_sm" color="dimmed">
                            Team:
                          </Text>
                          <Text code size="mono_sm" color="dimmed">
                            {users().filter((u) => !u.timeDeleted).length}
                          </Text>
                        </Row>
                      </CardHeader>
                      <div>
                        <For each={sortUsers(users(), selfEmail())}>
                          {(user) => <UserCard id={user.id} />}
                        </For>
                      </div>
                    </Card>
                    <For each={cols()[1]}>{renderAccount}</For>
                  </Col>
                </Row>
              </Stack>
            </Root>
          </>
        </Match>
      </Switch>
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
  const app = AppStore.watch.get(useReplicache(), () => props.stage.appID);
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

type UserCardProps = {
  id: string;
};

function UserCard(props: UserCardProps) {
  const rep = useReplicache();
  const user = createSubscription(() => UserStore.fromID(props.id));
  const auth = useAuth();
  const storage = useStorage();
  const self = createMemo(
    () => auth[storage.value.account].token.email === user()?.email
  );

  return (
    <Show when={!user()?.timeDeleted}>
      <UserRoot>
        <Row space="2" vertical="center">
          <AvatarInitialsIcon
            type="user"
            text={user()?.email || ""}
            style={{ width: "24px", height: "24px" }}
          />
          <Text line size="base" leading="normal">
            {user()?.email}
          </Text>
        </Row>
        <Row space="2" horizontal="center" style={{ flex: "0 0 auto" }}>
          <Show when={!user()?.timeSeen}>
            <Tag level="tip">Invited</Tag>
          </Show>
          <Show when={!self()}>
            <Dropdown
              size="sm"
              icon={<IconEllipsisVertical width={18} height={18} />}
            >
              <Dropdown.Item
                onSelect={() => {
                  if (
                    !confirm(
                      "Are you sure you want to remove them from the workspace?"
                    )
                  )
                    return;

                  rep().mutate.user_remove(props.id);
                }}
              >
                Remove
              </Dropdown.Item>
            </Dropdown>
          </Show>
        </Row>
      </UserRoot>
    </Show>
  );
}
