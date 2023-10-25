import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
} from "solid-js";
import { LinkButton, Button, Row, Stack, Text, FormInput, theme } from "$/ui";
import { Dropdown } from "$/ui/dropdown";
import {
  IconEllipsisHorizontal,
  IconEllipsisVertical,
  IconArrowLongRight,
  IconEnvelopeSolid,
} from "$/ui/icons";
import { IconLogosSlackBW } from "$/ui/icons/custom";
import { useReplicache } from "$/providers/replicache";
import { AppStore, IssueAlertStore } from "$/data/app";
import { Issue } from "@console/core/issue";
import { createStore, produce, unwrap } from "solid-js/store";
import { Select } from "$/ui/select";
import { UserStore } from "$/data/user";
import { StageStore } from "$/data/stage";
import { filter, map, pipe, uniq } from "remeda";
import { createId } from "@paralleldrive/cuid2";
import { style } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";

const PANEL_CONTENT_SPACE = "10";
const PANEL_HEADER_SPACE = "3";

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

export function Alerts() {
  const rep = useReplicache();
  const apps = AppStore.all.watch(rep, () => []);
  const users = UserStore.list.watch(
    rep,
    () => [],
    (users) => users.filter((u) => !u.timeDeleted)
  );
  const alerts = IssueAlertStore.all.watch(rep, () => []);
  const [data, setData] = createStore<{
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
  }>({
    source: {
      app: [],
    },
    destination: {},
  });
  const [isEditing, setEditing] = createSignal(false);

  const selectedApps = AppStore.all.watch(
    rep,
    () => [],
    (apps) =>
      apps
        .filter(
          (app) =>
            data.source?.app.includes("*") ||
            data.source?.app?.includes(app.name)
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
    setData(
      produce((val) => {
        val.id = undefined;
        val.source = {
          app: [],
        };
        val.destination = {};
      })
    );
    setEditing(true);
  }

  function editAlert(alert: Issue.Alert.Info, clone?: boolean) {
    alert = structuredClone(unwrap(alert));
    setData(
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
      })
    );
    setEditing(true);
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
              setData("destination", {
                type: option.value,
                email: {
                  users: [],
                },
                slack: {},
              });
            }}
            value={
              data.destination?.type
                ? {
                    value: data.destination.type,
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
                value={data.source?.app?.map((app) => ({ value: app }))}
                onChange={(options) => {
                  if (options.at(-1)?.value !== "*") {
                    setData("source", {
                      app: options
                        .filter((o) => o.value !== "*")
                        .map((o) => o.value),
                    });
                    return;
                  }
                  setData("source", "app", ["*"]);
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
                disabled={!data.source.app.length}
                value={
                  data.source.stage ? { value: data.source.stage } : undefined
                }
                onChange={(option) => {
                  setData("source", "stage", option?.value);
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
            <Match when={data.destination?.type === "email"}>
              <Select<string>
                multiple
                value={data.destination.email?.users?.map((value) => ({
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
                    setData(
                      "destination",
                      "email",
                      "users",
                      options.filter((o) => o.value !== "*").map((o) => o.value)
                    );
                    return;
                  }
                  setData("destination", "email", "users", ["*"]);
                }}
                triggerClass={alertsPanelRowEditingDropdown}
              />
            </Match>
            <Match when={data.destination?.type === "slack"}>
              <FormInput
                value={data.destination.slack?.channel}
                onBlur={(e) =>
                  setData(
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
        <LinkButton onClick={() => setEditing(false)}>Cancel</LinkButton>
        <Button
          onClick={async () => {
            const cloned = structuredClone(unwrap(data));
            await rep().mutate.issue_alert_put({
              id: cloned.id || createId(),
              source: {
                app: cloned.source.app.includes("*") ? "*" : cloned.source.app,
                stage:
                  cloned.source.stage === "*" ? "*" : [cloned.source.stage!],
              },
              destination:
                cloned.destination.type === "slack"
                  ? {
                      type: "slack",
                      properties: {
                        channel: cloned.destination.slack?.channel!,
                      },
                    }
                  : {
                      type: "email",
                      properties: {
                        users: cloned.destination.email?.users.includes("*")
                          ? "*"
                          : cloned.destination.email?.users!,
                      },
                    },
            });
            setEditing(false);
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
          when={alerts().length !== 0 || isEditing()}
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
                    <Show when={!isEditing() || data.id !== alert.id}>
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
                  <Show when={isEditing() && data.id === alert.id}>
                    <AlertsEditor />
                  </Show>
                </>
              )}
            </For>
            <Show when={isEditing() && !data.id}>
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
