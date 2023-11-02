import {
  For,
  Match,
  Show,
  Switch,
  createComputed,
  createSignal,
  createMemo,
} from "solid-js";
import {
  Row,
  Text,
  Stack,
  Input,
  theme,
  Button,
  Grower,
  FormField,
  LinkButton,
} from "$/ui";
import { utility } from "$/ui/utility";
import { Dropdown } from "$/ui/dropdown";
import {
  IconEnvelopeSolid,
  IconArrowLongRight,
  IconEllipsisVertical,
  IconEllipsisHorizontal,
  IconExclamationTriangle,
} from "$/ui/icons";
import { IconLogosSlackBW } from "$/ui/icons/custom";
import { useReplicache } from "$/providers/replicache";
import { AppStore, IssueAlertStore, SlackTeamStore } from "$/data/app";
import { Issue } from "@console/core/issue";
import { createStore, unwrap } from "solid-js/store";
import { MultiSelect, Select } from "$/ui/select";
import { UserStore } from "$/data/user";
import { StageStore } from "$/data/stage";
import { filter, map, pipe, uniq } from "remeda";
import { createId } from "@paralleldrive/cuid2";
import { style } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { array, literal, object, string, union, minLength } from "valibot";
import {
  reset,
  validate,
  valiForm,
  setValue,
  toCustom,
  getValue,
  setValues,
  getErrors,
  getValues,
  createForm,
} from "@modular-forms/solid";
import { WarningStore } from "$/data/warning";

const PANEL_CONTENT_SPACE = "10";
const PANEL_HEADER_SPACE = "3";

const AlertsPanel = styled("div", {
  base: {
    border: `1px solid ${theme.color.divider.base}`,
    borderRadius: theme.borderRadius,
  },
});

const alertsPanelRow = style({
  padding: `${theme.space[4]} ${theme.space[5]}`,
  borderBottom: `1px solid ${theme.color.divider.base}`,
  selectors: {
    "&:last-child": {
      borderBottom: "none",
    },
  },
});

const alertsPanelRowTitleEditing = style({
  opacity: 0.6,
});

const alertsPanelRowEditing = style({
  padding: theme.space[6],
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

const AlertsPanelRowSource = styled("div", {
  base: {
    ...utility.stack(3),
    flex: "1 1 auto",
    minWidth: 0,
  },
});

const alertsPanelRowEditingDropdown = style({
  flex: 1,
});

const MatchingStagesPanelRoot = styled("div", {
  base: {
    ...utility.stack(3),
    alignItems: "stretch",
  },
});

const MatchingStagesPanelExpanded = styled("div", {
  base: {
    paddingTop: theme.space[2],
    borderTop: `1px solid ${theme.color.divider.surface}`,
  },
});

const AlertsPanelRowIcon = styled("div", {
  base: {
    marginTop: theme.space[1],
    opacity: theme.iconOpacity,
    color: theme.color.text.secondary.base,
  },
});

const AlertsPanelToIcon = styled("div", {
  base: {
    opacity: theme.iconOpacity,
    lineHeight: `calc(${theme.font.lineHeight} * ${theme.font.size.sm})`,
    color: theme.color.text.secondary.base,
  },
  variants: {
    error: {
      true: {
        color: theme.color.text.danger.base,
      },
      false: {},
    },
  },
});

const AlertsPanelToLabel = styled("span", {
  base: {
    wordBreak: "break-all",
    fontSize: theme.font.size.sm,
    lineHeight: theme.font.lineHeight,
    color: theme.color.text.secondary.base,
  },
  variants: {
    error: {
      true: {
        color: theme.color.text.danger.base,
      },
      false: {},
    },
  },
});

const AlertsPanelRowFromLabel = styled("div", {
  base: {
    lineHeight: theme.font.lineHeight,
    color: theme.color.text.secondary.base,
  },
});

const AlertsPanelFromKeyword = styled("span", {
  base: {
    wordBreak: "break-all",
    fontWeight: theme.font.weight.medium,
    color: theme.color.text.primary.base,
  },
});

const alertsPanelRowEditingFieldLabel = style({
  width: 240,
});

function joinWithAnd(arr: string[]): string {
  const length = arr.length;

  if (length === 0) {
    return "";
  }

  if (length === 1) {
    return arr[0];
  }

  if (length === 2) {
    return `${arr[0]} and ${arr[1]}`;
  }

  const allButLast = arr.slice(0, length - 1).join(", ");
  return `${allButLast}, and ${arr[length - 1]}`;
}

const PutForm = object({
  destination: object({
    type: union([literal("email"), literal("slack")], "Must select type"),
    email: object({
      users: array(string(), [minLength(1)]),
    }),
    slack: object({
      channel: string([minLength(1, "Slack channel is required")]),
    }),
  }),
  source: object({
    app: array(string(), [minLength(1, "Must select at least one app")]),
    stage: string([minLength(1)]),
  }),
});

export function Alerts() {
  const rep = useReplicache();
  const users = UserStore.list.watch(
    rep,
    () => [],
    (users) => users.filter((u) => !u.timeDeleted)
  );
  const alerts = IssueAlertStore.all.watch(rep, () => []);

  const [putForm, { Form, Field }] = createForm({
    validate: valiForm(PutForm),
  });
  const [editing, setEditing] = createStore<{
    id?: string;
    active: boolean;
  }>({
    active: false,
  });

  const apps = AppStore.all.watch(rep, () => []);
  const stages = StageStore.list.watch(rep, () => []);
  const selectedApps = createMemo(() =>
    apps()
      .filter((app) => {
        const formData = getValues(putForm);
        return (
          formData.source?.app?.includes("*") ||
          formData.source?.app?.includes(app.name)
        );
      })
      .map((app) => app.id)
  );

  const availableStages = createMemo(() => {
    return pipe(
      stages(),
      filter((s) => selectedApps().includes(s.appID)),
      map((s) => s.name),
      uniq()
    );
  });

  const matchingStages = createMemo(() => {
    const stageFilter = getValue(putForm, "source.stage");
    const result = [];
    for (const app of apps()) {
      if (!selectedApps().includes(app.id)) continue;
      for (const stage of stages()) {
        if (stage.appID !== app.id) continue;
        if (stageFilter !== "*" && stageFilter !== stage.name) continue;
        result.push({ app: app.name, stage: stage.name });
      }
    }
    return result;
  });

  function createAlert() {
    reset(putForm);
    setValues(putForm, {
      source: {},
      destination: {},
    });
    setEditing("active", true);
    setEditing("id", undefined);
  }

  function editAlert(alert: Issue.Alert.Info, clone?: boolean) {
    reset(putForm);
    alert = structuredClone(unwrap(alert));

    // @ts-expect-error
    setValues(putForm, {
      source: {
        app: alert.source.app === "*" ? ["*"] : alert.source.app,
        stage: alert.source.stage === "*" ? "*" : alert.source.stage[0],
      },
      destination: {
        type: alert.destination.type,
        email: {
          users:
            alert.destination.type === "email"
              ? alert.destination.properties.users
              : [],
        },
        slack: {
          channel:
            alert.destination.type === "slack"
              ? alert.destination.properties.channel
              : undefined,
        },
      },
    });
    setEditing("active", true);
    setEditing("id", clone ? undefined : alert.id);
  }

  const MatchingStagesPanel = () => {
    const [expanded, setExpanded] = createSignal(false);
    return (
      <MatchingStagesPanelRoot>
        <div>
          <Text size="sm" on="surface" color="secondary">
            <Switch>
              <Match when={matchingStages().length === 0}>
                Does not match any stages
              </Match>
              <Match when={matchingStages().length === 1}>
                Matches 1 stage.{" "}
              </Match>
              <Match when={true}>
                Matches {matchingStages().length} stages.{" "}
              </Match>
            </Switch>
          </Text>
          <Show when={matchingStages().length > 0}>
            <Text
              underline
              size="sm"
              on="surface"
              color="secondary"
              onClick={() => setExpanded(!expanded())}
            >
              <Show when={!expanded()} fallback="Hide">
                <Switch>
                  <Match when={matchingStages().length === 1}>Show</Match>
                  <Match when={true}>Show all</Match>
                </Switch>
              </Show>
            </Text>
          </Show>
        </div>
        <Show when={expanded()}>
          <MatchingStagesPanelExpanded>
            <Text size="sm" color="secondary" on="surface" leading="loose">
              {joinWithAnd(
                matchingStages().map(({ app, stage }) => `${app}/${stage}`)
              )}
            </Text>
          </MatchingStagesPanelExpanded>
        </Show>
      </MatchingStagesPanelRoot>
    );
  };

  const AlertsEditor = () => (
    <Form
      onError={console.log}
      onSubmit={(e) => {
        console.log("submit", e);
      }}
      class={alertsPanelRowEditing}
    >
      <Stack space="6">
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
            <Row flex space="4" vertical="start">
              <Field name="destination.type">
                {(field, props) => (
                  <FormField
                    class={alertsPanelRowEditingDropdown}
                    color={field.error ? "danger" : "primary"}
                    hint={
                      getValue(putForm, "destination.type") === "slack" &&
                      !slackTeam() ? (
                        <span>
                          <a href="#slack">Connect your Slack</a> workspace{" "}
                          below.
                        </span>
                      ) : undefined
                    }
                  >
                    <Select
                      {...props}
                      value={field.value}
                      error={field.error}
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
                    />
                  </FormField>
                )}
              </Field>
              <Grower />
            </Row>
          </Row>
          <Row
            space="4"
            vertical="start"
            horizontal="start"
            class={alertsPanelRowEditingField}
          >
            <Stack
              space="1.5"
              flex={false}
              class={alertsPanelRowEditingFieldLabel}
            >
              <Text label on="surface" size="mono_sm">
                Source
              </Text>
              <Text leading="loose" on="surface" color="dimmed" size="sm">
                The apps and stages that'll be sending the alerts.
              </Text>
            </Stack>
            <AlertsPanelRowSource>
              <Row space="4" vertical="start">
                <Field type="string[]" name="source.app">
                  {(field, props) => {
                    const value = createMemo((prev: string[]) => {
                      const next = field.value || [];
                      if (next[0] === "") return [];
                      if (!prev.includes("*") && next.includes("*")) {
                        return ["*"];
                      }
                      if (prev.includes("*") && next.length > 1) {
                        return next.filter((v) => v !== "*");
                      }
                      return next;
                    }, []);

                    createComputed(() =>
                      setValue(putForm, "source.app", value())
                    );

                    return (
                      <FormField
                        label="App"
                        class={alertsPanelRowEditingDropdown}
                        color={field.error ? "danger" : "primary"}
                      >
                        <MultiSelect
                          {...props}
                          required
                          error={field.error}
                          value={field.value}
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
                        />
                      </FormField>
                    );
                  }}
                </Field>
                <Field name="source.stage">
                  {(field, props) => (
                    <FormField
                      label="Stages"
                      class={alertsPanelRowEditingDropdown}
                      color={
                        field.error && getValue(putForm, "source.app")?.length
                          ? "danger"
                          : "primary"
                      }
                    >
                      <Select
                        {...props}
                        value={field.value}
                        error={field.error}
                        disabled={!getValue(putForm, "source.app")?.length}
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
                      />
                    </FormField>
                  )}
                </Field>
              </Row>
              <Show
                when={
                  getValue(putForm, "source.app")?.length &&
                  getValue(putForm, "source.stage")?.length
                }
              >
                <MatchingStagesPanel />
              </Show>
            </AlertsPanelRowSource>
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
            <Row flex space="4" vertical="start">
              <Switch>
                <Match when={getValue(putForm, "destination.type") === "email"}>
                  <Field name="destination.email.users" type="string[]">
                    {(field, props) => {
                      const value = createMemo((prev: string[]) => {
                        const next = field.value || [];
                        if (next[0] === "") return [];
                        if (!prev.includes("*") && next.includes("*")) {
                          return ["*"];
                        }
                        if (prev.includes("*") && next.length > 1) {
                          return next.filter((v) => v !== "*");
                        }
                        return next;
                      }, []);

                      createComputed(() =>
                        setValue(putForm, "destination.email.users", value())
                      );
                      return (
                        <FormField
                          class={alertsPanelRowEditingDropdown}
                          color={field.error ? "danger" : "primary"}
                        >
                          <MultiSelect
                            {...props}
                            error={field.error}
                            value={field.value}
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
                          />
                        </FormField>
                      );
                    }}
                  </Field>
                </Match>
                <Match when={getValue(putForm, "destination.type") === "slack"}>
                  <Field
                    name="destination.slack.channel"
                    transform={toCustom(
                      (value) => {
                        if (!value) return "";
                        value = value.trim().toLowerCase();
                        if (value?.startsWith("#")) {
                          return value;
                        }
                        return `#${value}`;
                      },
                      {
                        on: "blur",
                      }
                    )}
                  >
                    {(field, props) => (
                      <FormField
                        class={alertsPanelRowEditingDropdown}
                        color={field.error ? "danger" : "primary"}
                      >
                        <Input
                          {...props}
                          value={field.value}
                          placeholder="#channel"
                        />
                      </FormField>
                    )}
                  </Field>
                </Match>
                <Match when={true}>
                  <FormField class={alertsPanelRowEditingDropdown}>
                    <Input disabled />
                  </FormField>
                </Match>
              </Switch>
              <Grower />
            </Row>
          </Row>
        </Stack>
        <Row space="4" vertical="center" horizontal="end">
          <LinkButton onClick={() => setEditing("active", false)}>
            Cancel
          </LinkButton>
          <Button
            type="submit"
            onClick={async () => {
              console.log("validate", await validate(putForm));
              const errors = getErrors(putForm);
              console.log("errors", errors);
              const cloned = getValues(putForm);
              console.log("values", cloned);
              if (Object.keys(getErrors(putForm)).length) return;
              await rep().mutate.issue_alert_put({
                id: editing.id || createId(),
                source: {
                  app: cloned.source!.app!.includes("*")
                    ? "*"
                    : cloned.source!.app!,
                  stage:
                    cloned.source?.stage === "*"
                      ? "*"
                      : [cloned.source?.stage!],
                },
                destination:
                  cloned.destination!.type === "slack"
                    ? {
                        type: "slack",
                        properties: {
                          channel: cloned.destination!.slack?.channel!,
                        },
                      }
                    : {
                        type: "email",
                        properties: {
                          users: cloned.destination!.email!.users!.includes("*")
                            ? "*"
                            : cloned.destination!.email!.users!,
                        },
                      },
              });
              setEditing("active", false);
            }}
            color={editing.id ? "success" : "primary"}
          >
            <Show when={editing.id} fallback={"Create"}>
              Update
            </Show>
          </Button>
        </Row>
      </Stack>
    </Form>
  );
  const slackWarnings = WarningStore.list.watch(
    rep,
    () => [],
    (warnings) =>
      Object.fromEntries(
        warnings
          .filter((w) => w.type === "issue_alert_slack")
          .map((w) => [w.target, w] as const)
      )
  );
  const slackTeam = SlackTeamStore.all.watch(
    rep,
    () => [],
    (all) => all.at(0)
  );

  return (
    <>
      <Stack id="alerts" space={PANEL_CONTENT_SPACE}>
        <Stack space={PANEL_HEADER_SPACE}>
          <Text size="lg" weight="medium">
            Alerts
          </Text>
          <Text size="sm" color="dimmed">
            Manage the alerts you want your team to receieve
          </Text>
        </Stack>
        <Show
          when={alerts().length !== 0 || editing.active}
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
              {(alert) => {
                const isEditingRow = createMemo(
                  () => editing.active && editing.id === alert.id
                );

                return (
                  <>
                    <Row
                      class={alertsPanelRow}
                      space="8"
                      vertical="center"
                      horizontal="between"
                    >
                      <Row
                        space="3"
                        vertical="start"
                        class={
                          isEditingRow()
                            ? alertsPanelRowTitleEditing
                            : undefined
                        }
                      >
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
                        <Stack space="2">
                          <AlertsPanelRowFromLabel>
                            From{" "}
                            <Show
                              when={alert.source.app !== "*"}
                              fallback={
                                <AlertsPanelFromKeyword>
                                  all apps
                                </AlertsPanelFromKeyword>
                              }
                            >
                              <>
                                <AlertsPanelFromKeyword>
                                  {alert.source.app !== "*" &&
                                    alert.source.app.join(", ")}
                                </AlertsPanelFromKeyword>{" "}
                                {alert.source.app.length > 1 ? "apps" : "app"}
                              </>
                            </Show>{" "}
                            /{" "}
                            <Show
                              when={alert.source.stage !== "*"}
                              fallback={
                                <AlertsPanelFromKeyword>
                                  all stages
                                </AlertsPanelFromKeyword>
                              }
                            >
                              <>
                                <AlertsPanelFromKeyword>
                                  {alert.source.stage !== "*" &&
                                    alert.source.stage.join(", ")}
                                </AlertsPanelFromKeyword>{" "}
                                {alert.source.app !== "*" &&
                                alert.source.app.length === 1
                                  ? "stage"
                                  : "stages"}
                              </>
                            </Show>
                          </AlertsPanelRowFromLabel>
                          <Row space="1.5" vertical="start">
                            <Switch>
                              <Match
                                when={
                                  alert.destination.type === "email" &&
                                  alert.destination
                                }
                              >
                                {(destination) => (
                                  <>
                                    <AlertsPanelToIcon>
                                      <IconArrowLongRight
                                        width={12}
                                        height={12}
                                      />
                                    </AlertsPanelToIcon>
                                    <AlertsPanelToLabel>
                                      {destination().properties.users === "*"
                                        ? "To all users in the workspace"
                                        : (
                                            destination().properties
                                              .users as string[]
                                          )
                                            .map(
                                              (id) =>
                                                users().find((u) => u.id === id)
                                                  ?.email
                                            )
                                            .join(", ")}
                                    </AlertsPanelToLabel>
                                  </>
                                )}
                              </Match>
                              <Match
                                when={
                                  alert.destination.type === "slack" &&
                                  alert.destination
                                }
                              >
                                {(destination) => (
                                  <Switch>
                                    <Match when={slackWarnings()[alert.id]}>
                                      <AlertsPanelToIcon error>
                                        <IconExclamationTriangle
                                          width={12}
                                          height={12}
                                        />
                                      </AlertsPanelToIcon>
                                      <AlertsPanelToLabel error>
                                        Make sure to invite @SST to the{" "}
                                        {destination().properties.channel}{" "}
                                        channel
                                      </AlertsPanelToLabel>
                                    </Match>
                                    <Match when={true}>
                                      <AlertsPanelToIcon>
                                        <IconArrowLongRight
                                          width={12}
                                          height={12}
                                        />
                                      </AlertsPanelToIcon>
                                      <AlertsPanelToLabel>
                                        To channel{" "}
                                        {destination().properties.channel}
                                      </AlertsPanelToLabel>
                                    </Match>
                                  </Switch>
                                )}
                              </Match>
                            </Switch>
                          </Row>
                        </Stack>
                      </Row>
                      <Show when={!isEditingRow()}>
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
                            icon={
                              <IconEllipsisVertical width={18} height={18} />
                            }
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
                    <Show when={isEditingRow()}>
                      <AlertsEditor />
                    </Show>
                  </>
                );
              }}
            </For>
            <Show when={editing.active && !editing.id}>
              <>
                <Show when={alerts().length !== 0}>
                  <Row class={alertsPanelRow} space="3" vertical="center">
                    <AlertsPanelRowIcon>
                      <IconEllipsisHorizontal width={18} height={18} />
                    </AlertsPanelRowIcon>
                    <Text size="sm" color="dimmed">
                      Add a new alert
                    </Text>
                  </Row>
                </Show>
                <AlertsEditor />
              </>
            </Show>
            <Show
              when={alerts().length !== 0 && (!editing.active || editing.id)}
            >
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
            </Show>
          </AlertsPanel>
        </Show>
      </Stack>
    </>
  );
}
