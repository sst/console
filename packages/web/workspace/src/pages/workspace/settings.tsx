import { Alert, Button, Row, Stack, Text, theme } from "$/ui";
import { AvatarInitialsIcon } from "$/ui/avatar-icon";
import { styled } from "@macaron-css/solid";
import { useWorkspace } from "./context";
import { utility } from "$/ui/utility";
import { FormInput } from "$/ui/form";
import { formatNumber } from "$/common/format";
import { createId } from "@paralleldrive/cuid2";
import { useReplicache } from "$/providers/replicache";
import { Link, useNavigate } from "@solidjs/router";
import { IconArrowsRightLeft } from "$/ui/icons";
import { IconAws } from "$/ui/icons/custom";
import { Header } from "./header";

const DUMMY_INOVACATION_COUNT = 4108819913;

const PANEL_CONTENT_SPACE = "8";
const PANEL_HEADER_SPACE = "3";
const TIER_LABEL_SPACE = "2";

type PricingTier = {
  from: number;
  to: number;
  rate: number;
};

type PricingPlan = PricingTier[];

const PRICING_PLAN: PricingPlan = [
  { from: 0, to: 200000, rate: 0 },
  { from: 200000, to: 1000000, rate: 0.0001 },
  { from: 1000000, to: Infinity, rate: 0.000001 },
];

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
    selectors: {
      "&:last-child": {
        borderRight: "none",
      },
    },
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

const UsageStatTier = styled("span", {
  base: {
    minWidth: 60,
    lineHeight: 1,
    fontSize: theme.font.size.mono_xs,
    fontFamily: theme.font.family.code,
    color: theme.color.text.secondary.base,
  },
});

export function Settings() {
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
          <Stack space="3">
            <UsagePanel>
              <UsageStat stretch>
                <Text code uppercase size="mono_xs" color="dimmed">
                  Invocations
                </Text>
                <Text code size="xl">
                  {DUMMY_INOVACATION_COUNT}
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
                    {calculateCost(DUMMY_INOVACATION_COUNT, PRICING_PLAN)}
                  </Text>
                </Row>
              </UsageStat>
              <UsageStat
                style={{ "background-color": theme.color.background.surface }}
              >
                <Stack space="1">
                  <Row space={TIER_LABEL_SPACE}>
                    <UsageStatTier>
                      {formatNumber(PRICING_PLAN[0].from)} -{" "}
                      {formatNumber(PRICING_PLAN[0].to)}
                    </UsageStatTier>
                    <Text color="dimmed" size="xs">
                      →
                    </Text>
                    <Text size="mono_xs" color="secondary">
                      Free
                    </Text>
                  </Row>
                  <Row space={TIER_LABEL_SPACE}>
                    <UsageStatTier>
                      {formatNumber(PRICING_PLAN[1].from)} -{" "}
                      {formatNumber(PRICING_PLAN[1].to)}
                    </UsageStatTier>
                    <Text color="dimmed" size="xs">
                      →
                    </Text>
                    <Text code size="mono_xs" color="secondary">
                      ${PRICING_PLAN[1].rate} per
                    </Text>
                  </Row>
                  <Row space={TIER_LABEL_SPACE}>
                    <UsageStatTier>
                      {formatNumber(PRICING_PLAN[2].from)} +
                    </UsageStatTier>
                    <Text color="dimmed" size="xs">
                      →
                    </Text>
                    <Text code size="mono_xs" color="secondary">
                      ${PRICING_PLAN[2].rate} per
                    </Text>
                  </Row>
                </Stack>
              </UsageStat>
            </UsagePanel>
            <Text size="sm" color="dimmed">
              Calculated for the period of Aug 1 - Aug 14.
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
          <Stack space="3" horizontal="start">
            {/*
            <Button color="secondary">Manage Billing Details</Button>
          */}
            <Button color="primary">Add Billing Details</Button>
            {/*
            <Text color="danger" size="sm">
              Your current usage is above the free tier. Please add your billing
              details.
            </Text>
          */}
          </Stack>
        </Stack>
      </SettingsRoot>
    </>
  );
}
