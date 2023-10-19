import { Show, createMemo } from "solid-js";
import { DateTime } from "luxon";
import { LinkButton, Button, Row, Stack, Text, theme } from "$/ui";
import { style } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { useWorkspace } from "./context";
import { utility } from "$/ui/utility";
import { Switch } from "$/ui/switch";
import { Dropdown } from "$/ui/dropdown";
import {
  IconEllipsisHorizontal,
  IconEllipsisVertical,
  IconArrowLongRight,
  IconEnvelopeSolid,
} from "$/ui/icons";
import { IconLogosSlack, IconLogosSlackBW } from "$/ui/icons/custom";
import { formatNumber } from "$/common/format";
import { useReplicache } from "$/providers/replicache";
import { PRICING_PLAN, PricingPlan, UsageStore } from "$/data/usage";
import { Header } from "./header";

const PANEL_CONTENT_SPACE = "8";
const PANEL_HEADER_SPACE = "3";
const TIER_LABEL_SPACE = "2";

function calculateCost(units: number, pricingPlan: PricingPlan) {
  let cost = 0;

  for (let tier of pricingPlan) {
    if (units > tier.from) {
      if (units < tier.to) {
        cost += (units - tier.from) * tier.rate;
        break;
      } else {
        cost += (tier.to - tier.from) * tier.rate;
      }
    }
  }

  return parseFloat(cost.toFixed(2));
}

const SettingsRoot = styled("div", {
  base: {
    paddingTop: 50,
    paddingBottom: 50,
    margin: "0 auto",
    width: theme.modalWidth.md,
  },
});

const Divider = styled("div", {
  base: {
    margin: `${theme.space[10]} 0`,
    width: "100%",
    height: 1,
    backgroundColor: theme.color.divider.base,
  },
});

const AlertsPanel = styled("div", {
  base: {
    border: `1px solid ${theme.color.divider.base}`,
    borderRadius: theme.borderRadius,
  },
});

const alertsPanelRow = style({
  padding: theme.space[5],
  borderBottom: `1px solid ${theme.color.divider.base}`,
  selectors: {
    "&:last-child": {
      borderBottom: "none",
    },
  },
});

const alertsPanelRowEditing = style({
  padding: theme.space[5],
  backgroundColor: theme.color.background.surface,
  borderBottom: `1px solid ${theme.color.divider.surface}`,
  selectors: {
    "&:last-child": {
      borderBottom: "none",
    },
  },
});

const alertsPanelRowEditingField = style({
  padding: `${theme.space[5]} 0`,
  borderBottom: `1px solid ${theme.color.divider.surface}`,
  selectors: {
    "&:first-child": {
      paddingTop: 0,
    },
  },
});

const AlertsPanelRowIcon = styled("div", {
  base: {
    opacity: theme.iconOpacity,
    color: theme.color.text.secondary.base,
  },
});

const AlertsPanelRowArrowIcon = styled("div", {
  base: {
    opacity: theme.iconOpacity,
    color: theme.color.text.secondary.base,
  },
});

const alertsPanelRowEditingFieldLabel = style({
  width: 100,
});

const UsagePanel = styled("div", {
  base: {
    ...utility.row(0),
    flex: 1,
    width: "100%",
    justifyContent: "space-between",
    border: `1px solid ${theme.color.divider.base}`,
    borderRadius: theme.borderRadius,
  },
});

const UsageStat = styled("div", {
  base: {
    ...utility.stack(4),
    justifyContent: "center",
    borderRight: `1px solid ${theme.color.divider.base}`,
    padding: `${theme.space[6]} ${theme.space[6]} ${theme.space[6]}`,
  },
  variants: {
    stretch: {
      true: {
        flex: 1,
      },
      false: {
        flex: "0 0 auto",
      },
    },
  },
  defaultVariants: {
    stretch: false,
  },
});

const UsageTiers = styled("div", {
  base: {
    ...utility.stack(4),
    flex: "0 0 auto",
    justifyContent: "center",
    backgroundColor: theme.color.background.surface,
    padding: `${theme.space[6]} ${theme.space[6]} ${theme.space[6]}`,
  },
});

const UsageStatTier = styled("span", {
  base: {
    minWidth: 60,
    lineHeight: 1,
    fontSize: theme.font.size.mono_xs,
    fontFamily: theme.font.family.code,
    color: theme.color.text.secondary.surface,
  },
});

function AlertsPanelRowControls() {
  return (
    <Row flex={false} space="2">
      <Button color="secondary" size="sm">
        Edit
      </Button>
      <Dropdown
        size="sm"
        icon={<IconEllipsisVertical width={18} height={18} />}
      >
        <Dropdown.Item>Duplicate alert</Dropdown.Item>
        <Dropdown.Seperator />
        <Dropdown.Item>Remove alert</Dropdown.Item>
      </Dropdown>
    </Row>
  );
}

export function Settings() {
  const rep = useReplicache();
  const usages = UsageStore.list.watch(rep, () => []);
  const invocations = createMemo(() =>
    usages()
      .map((usage) => usage.invocations)
      .reduce((a, b) => a + b, 0)
  );
  console.log("usages", usages().length);
  const workspace = useWorkspace();
  const cycle = createMemo(() => {
    const data = usages();
    const start = data[0] ? DateTime.fromSQL(data[0].day) : DateTime.now();
    return {
      start: start.startOf("month").toFormat("LLL d"),
      end: start.endOf("month").toFormat("LLL d"),
    };
  });

  //const slackWorkspace = "anomaly";
  const slackWorkspace = undefined;

  let portalLink: Promise<Response> | undefined;
  let checkoutLink: Promise<Response> | undefined;

  function generatePortalLink() {
    return fetch(
      import.meta.env.VITE_API_URL + "/rest/create_customer_portal_session",
      {
        method: "POST",
        body: JSON.stringify({ return_url: window.location.href }),
        headers: {
          "x-sst-workspace": workspace().id,
          Authorization: rep().auth,
        },
      }
    );
  }
  function generateCheckoutLink() {
    return fetch(
      import.meta.env.VITE_API_URL + "/rest/create_checkout_session",
      {
        method: "POST",
        body: JSON.stringify({ return_url: window.location.href }),
        headers: {
          "x-sst-workspace": workspace().id,
          Authorization: rep().auth,
        },
      }
    );
  }

  function handleHoverManageSubscription(e: MouseEvent) {
    if (portalLink) return;
    console.log("generate portal link");
    portalLink = generatePortalLink();
  }

  function handleHoverSubscribe(e: MouseEvent) {
    if (checkoutLink) return;
    console.log("generate checkout link");
    checkoutLink = generateCheckoutLink();
  }

  async function handleClickManageSubscription(e: MouseEvent) {
    e.stopPropagation();
    const response = await (portalLink || generatePortalLink());
    const result = await response.json();
    window.location.href = result.url;
  }

  async function handleClickSubscribe(e: MouseEvent) {
    e.stopPropagation();
    const response = await (checkoutLink || generateCheckoutLink());
    const result = await response.json();
    window.location.href = result.url;
  }

  return (
    <>
      <Header />
      <SettingsRoot>
        <Stack space={PANEL_HEADER_SPACE}>
          <Text size="xl" weight="medium">
            Workspace
          </Text>
          <Text size="base" color="dimmed">
            View and manage your workspace settings
          </Text>
        </Stack>
        <Divider />
        <Stack space={PANEL_CONTENT_SPACE}>
          <Stack space={PANEL_HEADER_SPACE}>
            <Text weight="medium">Alerts</Text>
            <Text size="sm" color="dimmed">
              Manage the alerts you want your team to receieve
            </Text>
          </Stack>
          <AlertsPanel>
            <Row
              class={alertsPanelRow}
              space="8"
              vertical="center"
              horizontal="between"
            >
              <Row space="3" vertical="start">
                <AlertsPanelRowIcon title="Email alert">
                  <IconEnvelopeSolid width={17} height={17} />
                </AlertsPanelRowIcon>
                <Stack space="3">
                  <Text size="base" color="secondary" leading="normal">
                    From{" "}
                    <Text size="base" weight="medium">
                      all apps
                    </Text>{" "}
                    /{" "}
                    <Text size="base" weight="medium">
                      stages
                    </Text>
                  </Text>
                  <Row space="1.5" vertical="center">
                    <AlertsPanelRowArrowIcon>
                      <IconArrowLongRight width={12} height={12} />
                    </AlertsPanelRowArrowIcon>
                    <Text color="secondary" size="sm">
                      All users in the workspace
                    </Text>
                  </Row>
                </Stack>
              </Row>
              <AlertsPanelRowControls />
            </Row>
            <Row
              class={alertsPanelRow}
              space="8"
              vertical="center"
              horizontal="between"
            >
              <Row space="3" vertical="start">
                <AlertsPanelRowIcon title="Email alert">
                  <IconEnvelopeSolid width={17} height={17} />
                </AlertsPanelRowIcon>
                <Stack space="3">
                  <Text size="base" color="secondary" leading="normal">
                    From{" "}
                    <Text size="base" weight="medium">
                      console
                    </Text>
                    <Text size="base" color="dimmed">
                      {" "}
                      /{" "}
                    </Text>
                    <Text size="base" weight="medium">
                      production
                    </Text>
                  </Text>
                  <Row space="1.5" vertical="center">
                    <AlertsPanelRowArrowIcon>
                      <IconArrowLongRight width={12} height={12} />
                    </AlertsPanelRowArrowIcon>
                    <Text color="dimmed" size="sm" leading="loose">
                      <Text color="secondary" size="sm">
                        dax@sst.dev
                      </Text>
                      ,{" "}
                      <Text color="secondary" size="sm">
                        frank@sst.dev
                      </Text>
                    </Text>
                  </Row>
                </Stack>
              </Row>
              <AlertsPanelRowControls />
            </Row>
            <Stack class={alertsPanelRowEditing} space="6">
              <Stack>
                <Row
                  class={alertsPanelRowEditingField}
                  space="5"
                  vertical="center"
                  horizontal="start"
                >
                  <Text
                    class={alertsPanelRowEditingFieldLabel}
                    label
                    on="surface"
                    size="mono_sm"
                  >
                    Type
                  </Text>
                  <Dropdown label="Type">
                    <Dropdown.Item>Email</Dropdown.Item>
                    <Dropdown.Item>Slack</Dropdown.Item>
                  </Dropdown>
                </Row>
                <Row
                  class={alertsPanelRowEditingField}
                  space="5"
                  vertical="center"
                  horizontal="start"
                >
                  <Text
                    class={alertsPanelRowEditingFieldLabel}
                    label
                    on="surface"
                    size="mono_sm"
                  >
                    Source
                  </Text>
                  <Row flex space="4" vertical="center">
                    <Dropdown label="App">
                      <Dropdown.Item>All apps / stages</Dropdown.Item>
                      <Dropdown.Seperator />
                      <Dropdown.Item>app1</Dropdown.Item>
                      <Dropdown.Item>app2</Dropdown.Item>
                    </Dropdown>
                    <Dropdown label="Stage">
                      <Dropdown.Item>stage1</Dropdown.Item>
                      <Dropdown.Item>stage2</Dropdown.Item>
                    </Dropdown>
                  </Row>
                </Row>
                <Row
                  class={alertsPanelRowEditingField}
                  space="5"
                  vertical="center"
                  horizontal="start"
                >
                  <Text
                    class={alertsPanelRowEditingFieldLabel}
                    label
                    on="surface"
                    size="mono_sm"
                  >
                    Destination
                  </Text>
                  <Dropdown label="To">
                    <Dropdown.Item>All users</Dropdown.Item>
                    <Dropdown.Seperator />
                    <Dropdown.Item>frank@sst.dev</Dropdown.Item>
                    <Dropdown.Item>dax@sst.dev</Dropdown.Item>
                    <Dropdown.Item>jay@sst.dev</Dropdown.Item>
                  </Dropdown>
                </Row>
              </Stack>
              <Row space="4" vertical="center" horizontal="end">
                <LinkButton>Cancel</LinkButton>
                <Button color="success">Update</Button>
              </Row>
            </Stack>
            <Row
              class={alertsPanelRow}
              space="8"
              vertical="center"
              horizontal="between"
            >
              <Row space="3" vertical="start">
                <AlertsPanelRowIcon title="Slack alert">
                  <IconLogosSlackBW width={18} height={18} />
                </AlertsPanelRowIcon>
                <Stack space="3">
                  <Text size="base" color="secondary" leading="normal">
                    From{" "}
                    <Text size="base" weight="medium">
                      console
                    </Text>
                    <Text size="base" color="dimmed">
                      {" "}
                      /{" "}
                    </Text>
                    <Text size="base" weight="medium">
                      production
                    </Text>
                  </Text>
                  <Row space="1.5" vertical="center">
                    <AlertsPanelRowArrowIcon>
                      <IconArrowLongRight width={12} height={12} />
                    </AlertsPanelRowArrowIcon>
                    <Text color="dimmed" size="sm" leading="loose">
                      <Text color="secondary" size="sm">
                        #engineering
                      </Text>
                    </Text>
                  </Row>
                </Stack>
              </Row>
              <AlertsPanelRowControls />
            </Row>
            <Row class={alertsPanelRow} space="3" vertical="center">
              <AlertsPanelRowIcon>
                <IconEllipsisHorizontal width={18} height={18} />
              </AlertsPanelRowIcon>
              <LinkButton code={false} size="sm" weight="regular">
                Add a new alert
              </LinkButton>
            </Row>
          </AlertsPanel>
          {/* // Empty state
          <Row>
            <Button color="secondary">Create Alert</Button>
          </Row>
            */}
        </Stack>
        <Divider />
        <Stack space={PANEL_CONTENT_SPACE}>
          <Stack space={PANEL_HEADER_SPACE}>
            <Text weight="medium">Usage</Text>
            <Text size="sm" color="dimmed">
              Usage for the current billing period
            </Text>
          </Stack>
          <Stack space="3.5">
            <UsagePanel>
              <UsageStat stretch>
                <Text code uppercase size="mono_xs" color="dimmed">
                  Invocations
                </Text>
                <Text code size="xl">
                  {invocations()}
                </Text>
              </UsageStat>
              <UsageStat>
                <Text code uppercase size="mono_xs" color="dimmed">
                  Current Cost
                </Text>
                <Row space="0.5" vertical="center">
                  <Text size="sm" color="secondary">
                    $
                  </Text>
                  <Text code weight="medium" size="xl">
                    {calculateCost(invocations(), PRICING_PLAN)}
                  </Text>
                </Row>
              </UsageStat>
              <UsageTiers>
                <Stack space="1">
                  <Row space={TIER_LABEL_SPACE}>
                    <UsageStatTier>
                      {formatNumber(PRICING_PLAN[0].from)} -{" "}
                      {formatNumber(PRICING_PLAN[0].to)}
                    </UsageStatTier>
                    <Text color="dimmed" on="surface" size="xs">
                      →
                    </Text>
                    <Text size="mono_xs" on="surface" color="secondary">
                      Free
                    </Text>
                  </Row>
                  <Row space={TIER_LABEL_SPACE}>
                    <UsageStatTier>
                      {formatNumber(PRICING_PLAN[1].from)} -{" "}
                      {formatNumber(PRICING_PLAN[1].to)}
                    </UsageStatTier>
                    <Text color="dimmed" on="surface" size="xs">
                      →
                    </Text>
                    <Text code size="mono_xs" on="surface" color="secondary">
                      ${PRICING_PLAN[1].rate} per
                    </Text>
                  </Row>
                  <Row space={TIER_LABEL_SPACE}>
                    <UsageStatTier>
                      {formatNumber(PRICING_PLAN[2].from)} +
                    </UsageStatTier>
                    <Text color="dimmed" on="surface" size="xs">
                      →
                    </Text>
                    <Text code size="mono_xs" on="surface" color="secondary">
                      ${PRICING_PLAN[2].rate} per
                    </Text>
                  </Row>
                </Stack>
              </UsageTiers>
            </UsagePanel>
            <Text size="sm" color="secondary">
              Calculated for the period of {cycle().start} — {cycle().end}.{" "}
              <a href="https://docs.sst.dev/console#pricing" target="_blank">
                Learn more
              </a>{" "}
              or <a href="mailto:hello@sst.dev">contact us</a> for volume
              pricing.
            </Text>
          </Stack>
        </Stack>
        <Divider />
        <Stack space={PANEL_CONTENT_SPACE} horizontal="start">
          <Stack space={PANEL_HEADER_SPACE}>
            <Text weight="medium">Billing</Text>
            <Text size="sm" color="dimmed">
              Manage your billing details, and download your invoices
            </Text>
          </Stack>
          <Stack space="3.5" horizontal="start">
            <Show when={workspace().stripeSubscriptionID}>
              <Button
                color="secondary"
                onMouseEnter={handleHoverManageSubscription}
                onClick={handleClickManageSubscription}
              >
                Manage Billing Details
              </Button>
            </Show>
            <Show when={!workspace().stripeSubscriptionID}>
              <Button
                color="primary"
                onMouseEnter={handleHoverSubscribe}
                onClick={handleClickSubscribe}
              >
                Add Billing Details
              </Button>
              <Show when={invocations() > PRICING_PLAN[0].to}>
                <Text color="danger" size="sm">
                  Your current usage is above the free tier. Please add your
                  billing details.
                </Text>
              </Show>
            </Show>
          </Stack>
        </Stack>
        {/*
        <Divider />
        <Stack space={PANEL_CONTENT_SPACE}>
          <Stack space={PANEL_HEADER_SPACE}>
            <Text weight="medium">Integrations</Text>
            <Text size="sm" color="dimmed">
              Connect your workspace with the services you use
            </Text>
          </Stack>
          <Row space="3.5" horizontal="between" vertical="center">
            <Row space="3" vertical="center">
              <IconLogosSlack width="32" height="32" />
              <Stack space="1.5">
                <Text weight="medium">Slack</Text>
                <Show
                  when={slackWorkspace}
                  fallback={
                    <Text size="sm" color="dimmed">
                      Connect to your Slack workspace
                    </Text>
                  }
                >
                  <Text size="sm" color="dimmed">
                    Connected to{" "}
                    <Text color="dimmed" size="sm" weight="medium">
                      anomaly
                    </Text>
                  </Text>
                </Show>
              </Stack>
            </Row>
            <Switch />
          </Row>
        </Stack>
        */}
      </SettingsRoot>
    </>
  );
}
