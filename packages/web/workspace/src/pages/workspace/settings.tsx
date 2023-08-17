import { Show, createMemo } from "solid-js";
import { DateTime } from "luxon";
import { Alert, Button, Row, Stack, Text, theme } from "$/ui";
import { AvatarInitialsIcon } from "$/ui/avatar-icon";
import { styled } from "@macaron-css/solid";
import { useWorkspace } from "./context";
import { utility } from "$/ui/utility";
import { FormInput } from "$/ui/form";
import { formatNumber } from "$/common/format";
import { createId } from "@paralleldrive/cuid2";
import { createSubscription, useReplicache } from "$/providers/replicache";
import { Link, useNavigate, useSearchParams } from "@solidjs/router";
import { IconArrowsRightLeft } from "$/ui/icons";
import { IconAws } from "$/ui/icons/custom";
import { PRICING_PLAN, PricingPlan, UsageStore } from "$/data/usage";
import { Header } from "./header";
import { DUMMY_SETTINGS } from "./overview-dummy";
import type { Usage } from "@console/core/billing";
import { usage } from "@console/core/billing/billing.sql";
import { create } from "@console/core/workspace";

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

export function Settings() {
  const rep = useReplicache();
  const [query] = useSearchParams();
  const usages = query.dummy
    ? () => DUMMY_SETTINGS[query.dummy as keyof typeof DUMMY_SETTINGS].usages
    : UsageStore.watch.scan(rep);
  const invocations = createMemo(() =>
    usages()
      .map((usage) => usage.invocations)
      .reduce((a, b) => a + b, 0)
  );
  const workspace = query.dummy
    ? () => DUMMY_SETTINGS[query.dummy as keyof typeof DUMMY_SETTINGS].workspace
    : useWorkspace();
  const cycle = createMemo(() => {
    const data = usages();
    const start = data[0] ? DateTime.fromSQL(data[0].day) : DateTime.now();
    return {
      start: start.startOf("month").toFormat("LLL d"),
      end: start.endOf("month").toFormat("LLL d"),
    };
  });

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
              Calculated for the period of {cycle().start} — {cycle().end}. Read
              more about our{" "}
              <a href="https://docs.sst.dev/console#pricing" target="_blank">
                pricing plan
              </a>
              .
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
      </SettingsRoot>
    </>
  );
}
