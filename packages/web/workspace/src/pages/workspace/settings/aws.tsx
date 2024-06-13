import { AccountStore } from "$/data/aws";
import { createSubscription, useReplicache } from "$/providers/replicache";
import { theme, utility, Text, Row, Stack } from "$/ui";
import { Dropdown } from "$/ui/dropdown";
import { IconEllipsisVertical, IconExclamationTriangle } from "$/ui/icons";
import { IconArrowPathSpin } from "$/ui/icons/custom";
import { styled } from "@macaron-css/solid";
import { Link } from "@solidjs/router";
import { For, Show } from "solid-js";

const Root = styled("div", {
  base: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
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
    padding: `0 ${theme.space[2]} 0 ${theme.space[4]}`,
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

export function AWS() {
  const accounts = createSubscription(AccountStore.list, []);
  const rep = useReplicache();

  return (
    <Stack space="10">
      <Stack space="3">
        <Text size="lg" weight="medium">
          AWS Accounts
        </Text>
        <Text size="sm" color="dimmed">
          Manage the connected aws accounts
        </Text>
      </Stack>
      <Root>
        <For each={accounts.value}>
          {(account) => (
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
                <Dropdown
                  size="sm"
                  icon={<IconEllipsisVertical width={18} height={18} />}
                >
                  <Dropdown.Item
                    disabled={account.timeDiscovered === null}
                    onSelect={() => {
                      rep().mutate.aws_account_scan(account.id);
                    }}
                  >
                    <Show
                      when={account.timeDiscovered}
                      fallback="Rescanning account…"
                    >
                      Rescan account
                    </Show>
                  </Dropdown.Item>
                  <Dropdown.Seperator />
                  <Dropdown.Item
                    onSelect={() => {
                      if (
                        !confirm(
                          "Are you sure you want to remove this account?",
                        )
                      )
                        return;
                      rep().mutate.aws_account_remove(account.id);
                    }}
                  >
                    Remove account
                  </Dropdown.Item>
                </Dropdown>
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
              </div>
            </Card>
          )}
        </For>
      </Root>
    </Stack>
  );
}
