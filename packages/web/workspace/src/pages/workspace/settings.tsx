import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
} from "solid-js";
import { DateTime } from "luxon";
import { LinkButton, Button, Row, Stack, Text, theme, FormInput } from "$/ui";
import { style } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { useWorkspace } from "./context";
import { utility } from "$/ui/utility";
import { Toggle } from "$/ui/switch";
import { Dropdown } from "$/ui/dropdown";
import {
  IconEllipsisHorizontal,
  IconEllipsisVertical,
  IconArrowLongRight,
  IconEnvelopeSolid,
} from "$/ui/icons";
import { IconLogosSlack, IconLogosSlackBW } from "$/ui/icons/custom";
import { formatNumber } from "$/common/format";
import { useFlags } from "$/providers/flags";
import { useReplicache } from "$/providers/replicache";
import { PRICING_PLAN, PricingPlan, UsageStore } from "$/data/usage";
import { Header } from "./header";
import { AppStore, IssueAlertStore, SlackTeamStore } from "$/data/app";
import { useAuth } from "$/providers/auth";
import { useStorage } from "$/providers/account";
import { createEventListener } from "@solid-primitives/event-listener";
import { Issue } from "@console/core/issue";
import { createStore, produce, unwrap } from "solid-js/store";
import { Select } from "$/ui/select";
import { UserStore } from "$/data/user";
import { StageStore } from "$/data/stage";
import { filter, map, pipe, uniq } from "remeda";
import { createId } from "@paralleldrive/cuid2";

const PANEL_CONTENT_SPACE = "10";
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
    width: theme.modalWidth.lg,
  },
});

const Divider = styled("div", {
  base: {
    margin: `${theme.space[12]} 0`,
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

const alertsPanelRowEditingDropdown = style({
  width: 220,
  maxWidth: "100%",
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
  width: 240,
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
  const usages = UsageStore.list.watch(rep, () => []);
  const invocations = createMemo(() =>
    usages()
      .map((usage) => usage.invocations)
      .reduce((a, b) => a + b, 0)
  );
  console.log("usages", usages().length);
  const workspace = useWorkspace();
  const flags = useFlags();
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
        <Show when={flags.alerts}>
          <Alerts />
        </Show>
        <Divider />
        <Stack space={PANEL_CONTENT_SPACE}>
          <Stack space={PANEL_HEADER_SPACE}>
            <Text size="lg" weight="medium">
              Usage
            </Text>
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
              <UsageStat stretch>
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
            <Text size="lg" weight="medium">
              Billing
            </Text>
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
        <Show when={flags.alerts}>
          <Integrations />
        </Show>
      </SettingsRoot>
    </>
  );
}

function Integrations() {
  const rep = useReplicache();
  const workspace = useWorkspace();
  const auth = useAuth();
  const storage = useStorage();
  const slackTeam = SlackTeamStore.all.watch(
    rep,
    () => [],
    (all) => all.at(0)
  );

  const [overrideSlack, setOverrideSlack] = createSignal(false);
  createEventListener(
    () => window,
    "message",
    (e) => {
      if (e.data === "success") setOverrideSlack(true);
    }
  );

  const apps = AppStore.all.watch(rep, () => []);

  return (
    <>
      <Divider />
      <Stack space={PANEL_CONTENT_SPACE}>
        <Stack space={PANEL_HEADER_SPACE}>
          <Text size="lg" weight="medium">
            Integrations
          </Text>
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
                when={slackTeam()}
                fallback={
                  <Text size="sm" color="dimmed">
                    Connect to your Slack workspace
                  </Text>
                }
              >
                <Text size="sm" color="dimmed">
                  Connected to{" "}
                  <Text color="dimmed" size="sm" weight="medium">
                    {slackTeam()?.teamName}
                  </Text>
                </Text>
              </Show>
            </Stack>
          </Row>
          <form
            action={import.meta.env.VITE_AUTH_URL + "/connect"}
            method="post"
            target="newWindow"
          >
            <Toggle
              checked={Boolean(slackTeam()) || overrideSlack()}
              onClick={(e) => {
                if (slackTeam()) {
                  rep().mutate.slack_disconnect(slackTeam()!.id);
                  setOverrideSlack(false);
                  return;
                }
                e.currentTarget.closest("form")?.submit();
              }}
            />
            <input type="hidden" name="provider" value="slack" />
            <input type="hidden" name="workspaceID" value={workspace().id} />
            <input
              type="hidden"
              name="token"
              value={auth[storage.value.account].session.token}
            />
          </form>
        </Row>
      </Stack>
    </>
  );
}

function Alerts() {
  const rep = useReplicache();
  const apps = AppStore.all.watch(rep, () => []);
  const users = UserStore.list.watch(
    rep,
    () => [],
    (users) => users.filter((u) => !u.timeDeleted)
  );
  const alerts = IssueAlertStore.all.watch(rep, () => []);
  const [editor, setEditor] = createStore<{
    id?: string;
    source: {
      app: string[];
      stage?: string;
    };
    destination: {
      type?: "email" | "slack";
      email?: {
        users: string[];
      };
      slack?: {
        channel?: string;
      };
    };
    active: boolean;
  }>({
    active: false,
    source: {
      app: [],
    },
    destination: {},
  });

  const selectedApps = AppStore.all.watch(
    rep,
    () => [],
    (apps) =>
      apps
        .filter(
          (app) =>
            editor.source?.app.includes("*") ||
            editor.source?.app?.includes(app.name)
        )
        .map((app) => app.id)
  );

  const stages = StageStore.list.watch(rep, () => []);
  const availableStages = createMemo(() => {
    return pipe(
      stages(),
      filter((s) => selectedApps().includes(s.appID)),
      map((s) => s.name),
      uniq()
    );
  });

  createEffect(() => console.log(availableStages()));

  function createAlert() {
    setEditor(
      produce((val) => {
        val.id = undefined;
        val.source = {
          app: [],
        };
        val.destination = {};
        val.active = true;
      })
    );
  }

  function editAlert(alert: Issue.Alert.Info, clone?: boolean) {
    alert = structuredClone(unwrap(alert));
    setEditor(
      produce((val) => {
        val.id = clone ? undefined : alert.id;
        val.source = {
          app: alert.source.app === "*" ? ["*"] : alert.source.app,
          stage: alert.source.stage === "*" ? "*" : alert.source.stage[0],
        };
        val.destination = {
          type: alert.destination.type,
          email:
            alert.destination.type === "email"
              ? {
                  users:
                    alert.destination.properties.users === "*"
                      ? ["*"]
                      : alert.destination.properties.users,
                }
              : undefined,
          slack:
            alert.destination.type === "slack"
              ? {
                  channel: alert.destination.properties.channel,
                }
              : undefined,
        };
        val.active = true;
      })
    );
  }

  const AlertsEditor = () => (
    <Stack class={alertsPanelRowEditing} space="6">
      <Stack>
        <Row
          space="4"
          vertical="start"
          horizontal="start"
          class={alertsPanelRowEditingField}
        >
          <Stack class={alertsPanelRowEditingFieldLabel} space="1.5">
            <Text label on="surface" size="mono_sm">
              Type
            </Text>
            <Text leading="loose" on="surface" color="dimmed" size="sm">
              The channel to use for sending the alerts.
            </Text>
          </Stack>
          <Select<Issue.Alert.Info["destination"]["type"]>
            onChange={(option) => {
              setEditor("destination", {
                type: option.value,
                email: {
                  users: [],
                },
                slack: {},
              });
            }}
            value={
              editor.destination?.type
                ? {
                    value: editor.destination.type,
                  }
                : undefined
            }
            options={[
              {
                value: "slack",
                label: "Slack",
              },
              {
                value: "email",
                label: "Email",
              },
            ]}
            triggerClass={alertsPanelRowEditingDropdown}
          />
        </Row>
        <Row
          space="4"
          vertical="start"
          horizontal="start"
          class={alertsPanelRowEditingField}
        >
          <Stack class={alertsPanelRowEditingFieldLabel} space="1.5">
            <Text label on="surface" size="mono_sm">
              Source
            </Text>
            <Text leading="loose" on="surface" color="dimmed" size="sm">
              The apps and stages that'll be sending alerts.
            </Text>
          </Stack>
          <Row flex space="4" vertical="center">
            <Stack space="2">
              <Text label on="surface" size="mono_sm" color="secondary">
                App
              </Text>
              <Select<string>
                multiple
                value={editor.source?.app?.map((app) => ({ value: app }))}
                onChange={(options) => {
                  if (options.at(-1)?.value !== "*") {
                    setEditor("source", {
                      app: options
                        .filter((o) => o.value !== "*")
                        .map((o) => o.value),
                    });
                    return;
                  }
                  setEditor("source", "app", ["*"]);
                }}
                options={[
                  {
                    label: "All apps",
                    value: "*",
                    seperator: true,
                  },
                  ...apps().map((app) => ({
                    label: app.name,
                    value: app.name,
                  })),
                ]}
                triggerClass={alertsPanelRowEditingDropdown}
              />
            </Stack>
            <Stack space="2">
              <Text label on="surface" size="mono_sm" color="secondary">
                Stage
              </Text>
              <Select<string>
                disabled={!editor.source.app.length}
                value={
                  editor.source.stage
                    ? { value: editor.source.stage }
                    : undefined
                }
                onChange={(option) => {
                  setEditor("source", "stage", option?.value);
                }}
                options={[
                  {
                    label: "All stages",
                    value: "*",
                    seperator: true,
                  },
                  ...availableStages().map((stage) => ({
                    label: stage,
                    value: stage,
                  })),
                ]}
                triggerClass={alertsPanelRowEditingDropdown}
              />
            </Stack>
          </Row>
        </Row>
        <Row
          space="4"
          vertical="start"
          horizontal="start"
          class={alertsPanelRowEditingField}
        >
          <Stack class={alertsPanelRowEditingFieldLabel} space="1.5">
            <Text label on="surface" size="mono_sm">
              Destination
            </Text>
            <Text leading="loose" on="surface" color="dimmed" size="sm">
              Specify who will be getting these alerts.
            </Text>
          </Stack>
          <Switch>
            <Match when={editor.destination?.type === "email"}>
              <Select<string>
                multiple
                value={editor.destination.email?.users?.map((value) => ({
                  value,
                }))}
                options={[
                  {
                    value: "*",
                    label: "All users",
                    seperator: true,
                  },
                  ...users().map((user) => ({
                    value: user.id,
                    label: user.email,
                  })),
                ]}
                onChange={(options) => {
                  if (options.at(-1)?.value !== "*") {
                    setEditor(
                      "destination",
                      "email",
                      "users",
                      options.filter((o) => o.value !== "*").map((o) => o.value)
                    );
                    return;
                  }
                  setEditor("destination", "email", "users", ["*"]);
                }}
                triggerClass={alertsPanelRowEditingDropdown}
              />
            </Match>
            <Match when={editor.destination?.type === "slack"}>
              <FormInput
                value={editor.destination.slack?.channel}
                onBlur={(e) =>
                  setEditor(
                    "destination",
                    "slack",
                    "channel",
                    e.currentTarget.value.startsWith("#")
                      ? e.currentTarget.value
                      : "#" + e.currentTarget.value
                  )
                }
                placeholder="#channel"
                style={{ width: "220px" }}
              />
            </Match>
          </Switch>
        </Row>
      </Stack>
      <Row space="4" vertical="center" horizontal="end">
        <LinkButton onClick={() => setEditor("active", false)}>
          Cancel
        </LinkButton>
        {/* Enable on valid form */}
        <Button
          onClick={async () => {
            const data = structuredClone(unwrap(editor));
            await rep().mutate.issue_alert_put({
              id: data.id || createId(),
              source: {
                app: data.source.app.includes("*") ? "*" : data.source.app,
                stage: data.source.stage === "*" ? "*" : [data.source.stage!],
              },
              destination:
                data.destination.type === "slack"
                  ? {
                      type: "slack",
                      properties: {
                        channel: data.destination.slack?.channel!,
                      },
                    }
                  : {
                      type: "email",
                      properties: {
                        users: data.destination.email?.users.includes("*")
                          ? "*"
                          : data.destination.email?.users!,
                      },
                    },
            });
            setEditor("active", false);
          }}
          color="success"
        >
          Update
        </Button>
      </Row>
    </Stack>
  );

  return (
    <>
      <Divider />
      <Stack space={PANEL_CONTENT_SPACE}>
        <Stack space={PANEL_HEADER_SPACE}>
          <Text size="lg" weight="medium">
            Alerts
          </Text>
          <Text size="sm" color="dimmed">
            Manage the alerts you want your team to receieve
          </Text>
        </Stack>
        <Show
          when={alerts().length !== 0 || editor.active}
          fallback={
            <Row>
              <Button color="secondary" onClick={() => createAlert()}>
                Add Alert
              </Button>
            </Row>
          }
        >
          <AlertsPanel>
            <For each={alerts()}>
              {(alert) => (
                <>
                  <Row
                    class={alertsPanelRow}
                    space="8"
                    vertical="center"
                    horizontal="between"
                  >
                    <Row space="3" vertical="start">
                      <AlertsPanelRowIcon title="Email alert">
                        <Switch>
                          <Match when={alert.destination.type === "email"}>
                            <IconEnvelopeSolid width={17} height={17} />
                          </Match>
                          <Match when={alert.destination.type === "slack"}>
                            <IconLogosSlackBW width={18} height={18} />
                          </Match>
                        </Switch>
                      </AlertsPanelRowIcon>
                      <Stack space="3">
                        <Text size="base" color="secondary" leading="normal">
                          From{" "}
                          <Text size="base" weight="medium">
                            {alert.source.app === "*"
                              ? "all apps"
                              : alert.source.app.join(", ")}
                          </Text>{" "}
                          matching
                          <Text size="base" weight="medium">
                            {alert.source.stage === "*"
                              ? " all stages"
                              : ` "${alert.source.stage.join(", ")}"`}
                          </Text>
                        </Text>
                        <Row space="1.5" vertical="center">
                          <AlertsPanelRowArrowIcon>
                            <IconArrowLongRight width={12} height={12} />
                          </AlertsPanelRowArrowIcon>
                          <Text color="secondary" size="sm">
                            <Switch>
                              <Match
                                when={
                                  alert.destination.type === "email" &&
                                  alert.destination
                                }
                              >
                                {(destination) =>
                                  destination().properties.users === "*"
                                    ? "All users in the workspace"
                                    : (
                                        destination().properties
                                          .users as string[]
                                      )
                                        .map(
                                          (id) =>
                                            users().find((u) => u.id === id)
                                              ?.email
                                        )
                                        .join(", ")
                                }
                              </Match>
                              <Match
                                when={
                                  alert.destination.type === "slack" &&
                                  alert.destination
                                }
                              >
                                {(destination) =>
                                  destination().properties.channel
                                }
                              </Match>
                            </Switch>
                          </Text>
                        </Row>
                      </Stack>
                    </Row>
                    <Show when={!editor.active || editor.id !== alert.id}>
                      <Row flex={false} space="2">
                        <Button
                          onClick={() => editAlert(alert)}
                          color="secondary"
                          size="sm"
                        >
                          Edit
                        </Button>
                        <Dropdown
                          size="sm"
                          icon={<IconEllipsisVertical width={18} height={18} />}
                        >
                          <Dropdown.Item
                            onSelect={() => {
                              editAlert(alert, true);
                            }}
                          >
                            Duplicate alert
                          </Dropdown.Item>
                          <Dropdown.Seperator />
                          <Dropdown.Item
                            onSelect={() => {
                              rep().mutate.issue_alert_remove(alert.id);
                            }}
                          >
                            Remove alert
                          </Dropdown.Item>
                        </Dropdown>
                      </Row>
                    </Show>
                  </Row>
                  <Show when={editor.active && editor.id === alert.id}>
                    <AlertsEditor />
                  </Show>
                </>
              )}
            </For>
            <Show when={editor.active && !editor.id}>
              <AlertsEditor />
            </Show>
            <Row class={alertsPanelRow} space="3" vertical="center">
              <AlertsPanelRowIcon>
                <IconEllipsisHorizontal width={18} height={18} />
              </AlertsPanelRowIcon>
              <LinkButton
                onClick={() => createAlert()}
                code={false}
                size="sm"
                weight="regular"
              >
                Add a new alert
              </LinkButton>
            </Row>
          </AlertsPanel>
        </Show>
      </Stack>
    </>
  );
}
