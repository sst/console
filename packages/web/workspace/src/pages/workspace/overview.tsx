import { AppStore } from "$/data/app";
import { UserStore } from "$/data/user";
import { AccountStore } from "$/data/aws";
import { StageStore } from "$/data/stage";
import { PRICING_PLAN, UsageStore } from "$/data/usage";
import { useAuth, useCurrentUser } from "$/providers/auth";
import { useStorage } from "$/providers/account";
import { useReplicache } from "$/providers/replicache";
import {
  theme,
  utility,
  Row,
  Tag,
  Text,
  Stack,
  Button,
  TextButton,
} from "$/ui";
import { Fullscreen } from "$/ui/layout";
import { Dropdown } from "$/ui/dropdown";
import {
  IconChevronRight,
  IconEllipsisVertical,
  IconExclamationTriangle,
} from "$/ui/icons";
import { AvatarInitialsIcon } from "$/ui/avatar-icon";
import { Syncing } from "$/ui/loader";
import { IconApp, IconArrowPathSpin } from "$/ui/icons/custom";
import type { Stage } from "@console/core/app";
import type { Account } from "@console/core/aws/account";
import { styled } from "@macaron-css/solid";
import { Link, useNavigate, useSearchParams } from "@solidjs/router";
import {
  For,
  Match,
  Show,
  Switch,
  createSignal,
  createEffect,
  createMemo,
} from "solid-js";
import { Header } from "./header";
import { useLocalContext } from "$/providers/local";
import { sortBy } from "remeda";
import { useWorkspace } from "./context";
import { useFlags } from "$/providers/flags";
import { User } from "@console/core/user";

const OVERFLOW_APPS_COUNT = 9;
const OVERFLOW_APPS_DISPLAY = 6;
const OVERFLOW_USERS_COUNT = 7;
const OVERFLOW_USERS_DISPLAY = 5;

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
    width: `calc(50% - ${theme.space[4]} / 2)`,
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

const CardErrorCopy = styled(Text, {
  base: {
    fontSize: theme.font.size.sm,
    color: `hsla(${theme.color.base.red}, 100%)`,
  },
});

const CardStatus = styled("div", {
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

const CardStatusIcon = styled("div", {
  base: {
    width: 16,
    height: 16,
  },
  variants: {
    status: {
      error: {
        color: `hsla(${theme.color.base.red}, 100%)`,
      },
      info: {
        color: theme.color.icon.dimmed,
      },
    },
  },
});

const CardOverflowRow = styled("div", {
  base: {
    textAlign: "center",
    padding: `${theme.space[3]} ${theme.space[4]}`,
    borderTop: `1px solid ${theme.color.divider.base}`,
  },
});

function sortUsers(users: User.Info[], selfEmail: string): User.Info[] {
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
  const accounts = AccountStore.list.watch(rep, () => []);
  const users = UserStore.list.watch(rep, () => []);
  const cols = createMemo(() => splitCols(accounts() || []));
  const stages = StageStore.list.watch(rep, () => []);
  const workspace = useWorkspace();
  const usages = UsageStore.list.watch(rep, () => []);
  const invocations = createMemo(() =>
    usages()
      .map((usage) => usage.invocations)
      .reduce((a, b) => a + b, 0)
  );
  const nav = useNavigate();
  const auth = useAuth();
  const storage = useStorage();
  const selfEmail = createMemo(() => auth[storage.value.account].session.email);

  const sortedUsers = createMemo(() =>
    sortUsers(
      users().filter((u) => !u.timeDeleted),
      selfEmail()
    )
  );
  const usersCapped = createMemo(() =>
    sortedUsers().length > OVERFLOW_USERS_COUNT
      ? sortedUsers().slice(0, OVERFLOW_USERS_DISPLAY)
      : sortedUsers()
  );
  const [showUsersOverflow, setUsersShowOverflow] = createSignal(false);

  createEffect(() => {
    if (accounts.ready && !accounts().length && !query.force)
      nav("account", {
        replace: true,
      });
  });

  function renderAccount(account: Account.Info) {
    const apps = AppStore.all.watch(rep, () => []);
    const children = createMemo(() => {
      return sortBy(
        stages().filter((stage) => stage.awsAccountID === account.id),
        (c) => apps().find((app) => app.id === c.appID)?.name || "",
        (c) => c.name
      );
    });
    const childrenCapped = createMemo(() =>
      children().length > OVERFLOW_APPS_COUNT
        ? children().slice(0, OVERFLOW_APPS_DISPLAY)
        : children()
    );
    const [showOverflow, setShowOverflow] = createSignal(false);
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
            <CardStatus>
              <CardStatusIcon status="error">
                <IconExclamationTriangle />
              </CardStatusIcon>
              <Link href="account">
                <CardErrorCopy>Reconnect account</CardErrorCopy>
              </Link>
            </CardStatus>
          </Show>
          <For each={showOverflow() ? children() : childrenCapped()}>
            {(stage) => <StageCard stage={stage} />}
          </For>
          <Show when={!account.timeDiscovered && !account.timeFailed}>
            <CardStatus>
              <CardStatusIcon status="info">
                <IconArrowPathSpin />
              </CardStatusIcon>
              <Text size="sm" color="dimmed">
                Searching for SST apps&hellip;
              </Text>
            </CardStatus>
          </Show>
          <Show
            when={
              children().length === 0 &&
              !account.timeFailed &&
              account.timeDiscovered
            }
          >
            <CardStatus>
              <CardStatusIcon status="info">
                <IconExclamationTriangle />
              </CardStatusIcon>
              <Text size="sm" color="dimmed">
                No SST v2 apps found
              </Text>
            </CardStatus>
          </Show>
          <Show when={children().length > OVERFLOW_APPS_COUNT}>
            <CardOverflowRow>
              <TextButton onClick={() => setShowOverflow(!showOverflow())}>
                <Show when={showOverflow()} fallback="Show all apps">
                  Hide
                </Show>
              </TextButton>
            </CardOverflowRow>
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
                View local logs from all your functions in one tab.{" "}
                <a
                  href="https://docs.sst.dev/advanced/console-updates#local-logs-tab"
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
                            fallback="Manage workspace"
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
                          <ManageWorkspaceIcon>
                            <IconChevronRight width="13" height="13" />
                          </ManageWorkspaceIcon>
                        </Row>
                      </TextButton>
                    </Link>
                  </PageHeader>
                  <Row space="4" vertical="center">
                    <Show when={useFlags().alerts}>
                      <form
                        action={import.meta.env.VITE_AUTH_URL + "/connect"}
                        method="post"
                        target="_blank"
                      >
                        <input type="hidden" name="provider" value="slack" />
                        <input
                          type="hidden"
                          name="workspaceID"
                          value={workspace().id}
                        />
                        <input
                          type="hidden"
                          name="token"
                          value={auth[storage.value.account].session.token}
                        />
                        <Button color="secondary">Connect Slack</Button>
                      </form>
                    </Show>
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
                            {sortedUsers().length}
                          </Text>
                        </Row>
                      </CardHeader>
                      <div>
                        <For
                          each={
                            showUsersOverflow() ? sortedUsers() : usersCapped()
                          }
                        >
                          {(user) => <UserCard id={user.id} />}
                        </For>
                        <Show
                          when={sortedUsers().length > OVERFLOW_USERS_COUNT}
                        >
                          <CardOverflowRow>
                            <TextButton
                              onClick={() =>
                                setUsersShowOverflow(!showUsersOverflow())
                              }
                            >
                              <Show
                                when={showUsersOverflow()}
                                fallback="Show all users"
                              >
                                Hide
                              </Show>
                            </TextButton>
                          </CardOverflowRow>
                        </Show>
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
  const app = AppStore.get.watch(useReplicache(), () => [props.stage.appID]);
  const local = useLocalContext();
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
  const user = UserStore.get.watch(rep, () => [props.id]);
  const self = useCurrentUser();

  return (
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
        <Show when={self()?.id !== user()?.id}>
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
  );
}
