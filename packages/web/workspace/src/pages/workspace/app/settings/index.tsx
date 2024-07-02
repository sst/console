import {
  AppRepoStore,
  RunConfigStore,
  GithubOrgStore,
  GithubRepoStore,
  RunStore,
} from "$/data/app";
import {
  theme,
  utility,
  Tag,
  Row,
  Text,
  Stack,
  Input,
  TabTitle,
  Grower,
  Button,
  FormField,
  ButtonIcon,
  LinkButton,
} from "$/ui";
import { Select } from "$/ui/select";
import { Dropdown } from "$/ui/dropdown";
import {
  Divider,
  SettingsRoot,
  PANEL_HEADER_SPACE,
  PANEL_CONTENT_SPACE,
} from "../../settings";
import { DateTime } from "luxon";
import { Header, PageHeader } from "../../header";
import { Link } from "@solidjs/router";
import { style } from "@macaron-css/core";
import type { RunConfig } from "@console/core/run/config";
import { styled } from "@macaron-css/solid";
import { useAppContext } from "../context";
import { useWorkspace } from "../../context";
import { useAuth2 } from "$/providers/auth2";
import { createId } from "@paralleldrive/cuid2";
import { IconEllipsisVertical } from "$/ui/icons";
import { createEventListener } from "@solid-primitives/event-listener";
import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
} from "solid-js";
import { useReplicache, createSubscription } from "$/providers/replicache";
import { githubRepo } from "$/common/url-builder";
import {
  insert,
  valiForm,
  createForm,
  setValue,
  setValues,
  remove,
  reset,
} from "@modular-forms/solid";
import {
  IconPr,
  IconAdd,
  IconGit,
  IconCommit,
  IconGitHub,
  IconSubRight,
} from "$/ui/icons/custom";
import { array, minLength, object, optional, string } from "valibot";
import { AWS } from "$/data/aws";
import { createStore } from "solid-js/store";
import { fromEntries, map, pipe, sortBy, filter } from "remeda";

const HEADER_HEIGHT = 54;
const SELECT_REPO_NAME = "select-repo";

const GitRepoRoot = styled("div", {
  base: {
    ...utility.stack(6),
    width: "100%",
  },
});

const GitRepoPanel = styled("div", {
  base: {
    ...utility.stack(5),
    width: "100%",
  },
});

const GitRepoPanelRow = styled("div", {
  base: {
    ...utility.row(5),
    alignItems: "center",
    justifyContent: "space-between",
  },
});

const GitRepoIcon = styled("div", {
  base: {
    opacity: theme.iconOpacity,
    color: theme.color.text.primary.base,
  },
});

const GitRepoLink = styled("a", {
  base: {
    fontWeight: theme.font.weight.medium,
    lineHeight: 2,
  },
});

const GitRepoLinkSeparator = styled("span", {
  base: {
    fontWeight: theme.font.weight.regular,
    paddingInline: 4,
  },
});

const TargetsRoot = styled("div", {
  base: {
    ...utility.stack(4),
    width: "100%",
  },
});

const TargetHeader = styled("div", {
  base: {
    ...utility.row(2),
    alignItems: "center",
    justifyContent: "space-between",
  },
});

const TargetHeaderCopy = styled("span", {
  base: {
    ...utility.text.label,
    fontSize: theme.font.size.mono_base,
    color: theme.color.text.secondary.base,
  },
});

const TargetsEmpty = styled("div", {
  base: {
    height: HEADER_HEIGHT,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    borderRadius: `0 0 ${theme.borderRadius} ${theme.borderRadius}`,
    border: `1px solid ${theme.color.divider.base}`,
    paddingLeft: theme.space[3],
    ":first-child": {
      height: 180,
      justifyContent: "center",
      backgroundColor: "transparent",
      borderTopLeftRadius: theme.borderRadius,
      borderTopRightRadius: theme.borderRadius,
      border: `2px dashed ${theme.color.divider.base}`,
    },
  },
});

const TargetsEmptyIcon = styled("span", {
  base: {
    lineHeight: 0,
    paddingRight: 7,
    opacity: theme.iconOpacity,
  },
});

const TargetsEmptySeparator = styled("div", {
  base: {
    marginInline: `calc(${theme.space[5]} + 3px)`,
    borderLeft: `1px solid ${theme.color.text.dimmed.base}`,
  },
});

const TargetFormRoot = styled("div", {
  base: {
    borderWidth: "1px 1px 0 1px",
    borderStyle: "solid",
    borderColor: theme.color.divider.base,
    selectors: {
      "&:first-child": {
        borderTopLeftRadius: theme.borderRadius,
        borderTopRightRadius: theme.borderRadius,
      },
      "&:last-child": {
        borderBottomLeftRadius: theme.borderRadius,
        borderBottomRightRadius: theme.borderRadius,
        borderBottomWidth: 1,
      },
    },
  },
});

const targetForm = style({
  backgroundColor: theme.color.background.surface,
});

const TargetFormHeader = styled("div", {
  base: {
    ...utility.row(2),
    height: HEADER_HEIGHT,
    alignItems: "center",
    justifyContent: "space-between",
    padding: `0 ${theme.space[3]} 0 ${theme.space[3]}`,
    borderBottom: `1px solid ${theme.color.divider.base}`,
    selectors: {
      "&:last-child": {
        borderBottomWidth: 0,
      },
    },
  },
});

const TargetFormHeaderLeft = styled("div", {
  base: {
    ...utility.row(2.5),
    alignItems: "center",
  },
});

const TargetFormHeaderRight = styled("div", {
  base: {
    ...utility.row(2),
    alignItems: "center",
  },
});


const TargetFormHeaderCopy = styled("div", {
  base: {
    fontWeight: theme.font.weight.medium,
  },
  variants: {
    new: {
      true: {
        color: theme.color.text.secondary.base,
      },
    },
  },
});

const TargetFormRow = styled("div", {
  base: {
    ...utility.row(4),
    alignItems: "flex-start",
    justifyContent: "center",
    padding: `${theme.space[6]} ${theme.space[5]}`,
    borderBottom: `1px solid ${theme.color.divider.surface}`,
    ":last-child": {
      borderBottom: "none",
    },
  },
});

const TargetFormRowControls = styled(TargetFormRow, {
  base: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
});

const TargetFormFieldLabel = styled("div", {
  base: {
    ...utility.stack(1.5),
    flex: "0 0 auto",
    width: 240,
  },
});

const TargetFormFieldLabelCopy = styled("span", {
  base: {
    ...utility.text.label,
    color: theme.color.text.primary.surface,
    fontSize: theme.font.size.mono_sm,
  },
});

const TargetFormFieldLabelDesc = styled("span", {
  base: {
    color: theme.color.text.dimmed.surface,
    fontSize: theme.font.size.sm,
    lineHeight: theme.font.lineHeight,
  },
});

const TargetFormField = styled("div", {
  base: {
    ...utility.row(4),
    flex: "1 1 auto",
    alignItems: "flex-start",
  },
});

const TargetAddAccountLink = styled(Link, {
  base: {
    fontSize: theme.font.size.sm,
  },
});

const TargetFormFieldStack = styled("div", {
  base: {
    ...utility.stack(4),
    flex: "1 1 auto",
  },
});

const TargetFormFieldCol = styled("div", {
  base: {
    ...utility.row(2),
    flex: 1,
    alignItems: "flex-end",
  },
});

const TargetAddVarLink = styled(LinkButton, {
  base: {
    fontSize: theme.font.size.sm,
    fontFamily: theme.font.family.body,
    fontWeight: theme.font.weight.regular,
  },
});

const TargetAddVarIcon = styled("span", {
  base: {
    lineHeight: 0,
    paddingRight: 6,
    opacity: theme.iconOpacity,
  },
});

const targetFormFieldDropdown = style({
  marginBlock: 4,
});

const targetFormFieldFlex = style({
  flex: 1,
});

const GitOrgError = styled("div", {
  base: {
    ...utility.row(3),
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: theme.borderRadius,
    padding: `${theme.space[3]} ${theme.space[3]} ${theme.space[3]} ${theme.space[4]}`,
  },
  variants: {
    danger: {
      true: {
        backgroundColor: theme.color.background.red,
        color: `hsla(${theme.color.red.l2}, 100%)`,
      },
      false: {
        border: `2px dashed ${theme.color.divider.base}`,
        color: theme.color.text.primary.surface,
      },
    },
  },
});

const GitOrgErrorCopy = styled("div", {
  base: {
    fontSize: theme.font.size.sm,
  },
});

const SelectRepoRoot = styled("div", {
  base: {
    ...utility.row(3.5),
    maxWidth: 440,
    alignItems: "flex-start",
  },
});

const selectRepo = style({
  flex: 1,
});

export const EditTargetForm = object({
  stagePattern: string([minLength(1, "Set a stage pattern")]),
  awsAccount: string([minLength(1, "Pick an AWS account")]),
  env: optional(
    array(
      object({
        key: string([minLength(1, "Set the key of the variable")]),
        value: string([minLength(1, "Set the value of the variable")]),
      })
    )
  ),
});

export function Settings() {
  const auth = useAuth2();
  const rep = useReplicache();
  const app = useAppContext();
  const workspace = useWorkspace();
  const runConfigs = createSubscription(
    (tx) => RunConfigStore.forApp(tx, app.app.id),
    []
  );

  const appRepo = createSubscription((tx) =>
    AppRepoStore.forApp(tx, app.app.id).then((repos) => repos[0])
  );

  const needsGithub = createSubscription(async (tx) => {
    const ghOrgs = await GithubOrgStore.all(tx);
    const appRepo = await AppRepoStore.forApp(tx, app.app.id).then(
      (repos) => repos[0]
    );
    if (appRepo) {
      const ghRepo = await GithubRepoStore.get(tx, appRepo.repoID);
      const match = ghOrgs.find((org) => org.id === ghRepo.githubOrgID);
      return !match || Boolean(match.time.disconnected);
    }
    return ghOrgs.filter((org) => !org.time.disconnected).length === 0;
  });

  const awsAccounts = createSubscription(AWS.AccountStore.list, []);
  const [editing, setEditing] = createStore<{
    id?: string;
    active: boolean;
  }>({
    active: false,
  });
  const latestRunError = createSubscription(async (tx) => {
    const runs = await RunStore.all(tx);
    const run = runs
      .filter((run) => run.appID === app.app.id)
      .sort(
        (a, b) =>
          DateTime.fromISO(b.time.created).toMillis() -
          DateTime.fromISO(a.time.created).toMillis()
      )[0];
    return run?.status === "error";
  });

  const [overrideGithub, setOverrideGithub] = createSignal(false);

  createEventListener(
    () => window,
    "message",
    (e) => {
      if (e.data === "github.success") setOverrideGithub(true);
    }
  );

  const [putForm, { Form, Field, FieldArray }] = createForm({
    validate: valiForm(EditTargetForm),
  });

  interface TargetProps {
    config: RunConfig.Info;
  }
  function Target(props: TargetProps) {
    const config = props.config;

    return (
      <TargetFormRoot>
        <TargetFormHeader>
          <TargetFormHeaderLeft>
            <Tag>{config.awsAccountExternalID}</Tag>
            <TargetFormHeaderCopy>
              {config.stagePattern}
            </TargetFormHeaderCopy>
          </TargetFormHeaderLeft>
          <TargetFormHeaderRight>
            <Button
              onClick={() => {
                setEditing("id", config.id);
                setEditing("active", true);
                reset(putForm);
                setValues(putForm, {
                  stagePattern: config.stagePattern,
                  awsAccount:
                    config.awsAccountExternalID,
                  env: Object.entries(config.env).map(
                    ([key, value]) => ({
                      key,
                      value,
                    })
                  ),
                });
              }}
              color="secondary"
              size="sm"
            >
              Edit
            </Button>
            <Dropdown size="sm" icon={<IconEllipsisVertical width={18} height={18} />}>
              {/*
            <Dropdown.Item
              onSelect={() => {
                setEditing("id", undefined);
                setEditing("active", true);
                reset(putForm);
                setValues(putForm, {
                  stagePattern: config.stagePattern,
                  awsAccount:
                    config.awsAccountExternalID,
                  env: Object.entries(config.env).map(
                    ([key, value]) => ({
                      key,
                      value,
                    }),
                  ),
                });
              }}
            >
              Duplicate target
            </Dropdown.Item>
            */}
              <Dropdown.Item
                onSelect={() => {
                  if (
                    !confirm(
                      "Are you sure you want to remove this environment?"
                    )
                  )
                    return;
                  rep().mutate.run_config_remove(
                    config.id
                  );
                }}
              >
                Remove environment
              </Dropdown.Item>
            </Dropdown>
          </TargetFormHeaderRight>
        </TargetFormHeader>
      </TargetFormRoot>
    );
  }

  interface TargetFormProps {
    new?: boolean;
  }

  function TargetForm(props: TargetFormProps) {
    return (
      <TargetFormRoot>
        <Form
          class={targetForm}
          onSubmit={(data) => {
            rep().mutate.run_config_put({
              id: editing.id || createId(),
              stagePattern: data.stagePattern,
              awsAccountExternalID: data.awsAccount,
              appID: app.app.id,
              env: fromEntries(
                (data.env || []).map((item) => [item.key, item.value])
              ),
            });
            setEditing("active", false);
          }}
        >
          <TargetFormRow>
            <TargetFormFieldLabel>
              <TargetFormFieldLabelCopy>Stage</TargetFormFieldLabelCopy>
              <TargetFormFieldLabelDesc>
                The stage that's being deployed. Accepts glob patterns.
              </TargetFormFieldLabelDesc>
            </TargetFormFieldLabel>
            <TargetFormField>
              <Field name="stagePattern">
                {(field, props) => (
                  <FormField
                    color={field.error ? "danger" : "primary"}
                    hint={
                      field.error ||
                      (field.value?.startsWith("pr-")
                        ? "By default, pull requests are deployed to a stage `pr-<number>`. "
                        : "By default, branches are deployed to a stage with the same name.")
                    }
                    class={targetFormFieldFlex}
                  >
                    <Input
                      {...props}
                      autofocus
                      type="text"
                      placeholder="production"
                      value={field.value || ""}
                    />
                  </FormField>
                )}
              </Field>
              <Grower />
            </TargetFormField>
          </TargetFormRow>
          <TargetFormRow>
            <TargetFormFieldLabel>
              <TargetFormFieldLabelCopy>AWS Account</TargetFormFieldLabelCopy>
              <TargetFormFieldLabelDesc>
                The account this stage is being deployed to.
              </TargetFormFieldLabelDesc>
            </TargetFormFieldLabel>
            <TargetFormField>
              <Field name="awsAccount">
                {(field, props) => (
                  <FormField
                    color={field.error ? "danger" : "primary"}
                    class={targetFormFieldFlex}
                    hint={
                      <Show when={!field.error} fallback={field.error}>
                        <TargetAddAccountLink href="../../settings#accounts">
                          Connect another AWS account
                        </TargetAddAccountLink>
                      </Show>
                    }
                  >
                    <Select
                      {...props}
                      error={field.error}
                      value={field.value}
                      options={awsAccounts.value.map((item) => ({
                        value: item.accountID,
                        label: item.accountID,
                      }))}
                    />
                  </FormField>
                )}
              </Field>
              <Grower />
            </TargetFormField>
          </TargetFormRow>
          <TargetFormRow>
            <TargetFormFieldLabel>
              <TargetFormFieldLabelCopy>
                Environment Variables
              </TargetFormFieldLabelCopy>
              <TargetFormFieldLabelDesc>
                A list of environment variables for the runner.
              </TargetFormFieldLabelDesc>
            </TargetFormFieldLabel>
            <TargetFormFieldStack>
              <FieldArray name="env">
                {(fieldArray) => {
                  return (
                    <>
                      <For each={fieldArray.items}>
                        {(_, index) => (
                          <TargetFormField>
                            <Field name={`env.${index()}.key`}>
                              {(field, props) => (
                                <FormField
                                  hint={field.error}
                                  color={field.error ? "danger" : "primary"}
                                  label={index() === 0 ? "Key" : undefined}
                                  class={targetFormFieldFlex}
                                >
                                  <Input
                                    {...props}
                                    value={field.value}
                                    type="text"
                                  />
                                </FormField>
                              )}
                            </Field>
                            <TargetFormFieldCol>
                              <Field name={`env.${index()}.value`}>
                                {(field, props) => (
                                  <FormField
                                    hint={field.error}
                                    color={field.error ? "danger" : "primary"}
                                    label={index() === 0 ? "Value" : undefined}
                                    class={targetFormFieldFlex}
                                  >
                                    <Input
                                      {...props}
                                      value={field.value}
                                      onPaste={(e) => {
                                        const data =
                                          e.clipboardData?.getData(
                                            "text/plain"
                                          );
                                        if (!data) return;
                                        setValue(
                                          putForm,
                                          `env.${index()}.value`,
                                          data
                                        );
                                        e.currentTarget.value = "0".repeat(
                                          data.length
                                        );
                                        e.preventDefault();
                                      }}
                                      type="password"
                                    />
                                  </FormField>
                                )}
                              </Field>
                              <Dropdown
                                size="sm"
                                triggerClass={targetFormFieldDropdown}
                                icon={
                                  <IconEllipsisVertical
                                    width={18}
                                    height={18}
                                  />
                                }
                              >
                                <Dropdown.Item
                                  onSelect={() => {
                                    remove(putForm, "env", { at: index() });
                                  }}
                                >
                                  Remove variable
                                </Dropdown.Item>
                              </Dropdown>
                            </TargetFormFieldCol>
                          </TargetFormField>
                        )}
                      </For>
                      <TargetAddVarLink
                        onClick={() => {
                          insert(putForm, "env", {
                            value: { key: "", value: "" },
                          });
                        }}
                      >
                        <TargetAddVarIcon>
                          <IconAdd width="10" height="10" />
                        </TargetAddVarIcon>
                        <Show
                          when={fieldArray.items.length !== 0}
                          fallback="Add a variable"
                        >
                          Add another variable
                        </Show>
                      </TargetAddVarLink>
                    </>
                  );
                }}
              </FieldArray>
            </TargetFormFieldStack>
          </TargetFormRow>
          <TargetFormRowControls>
            <LinkButton onClick={() => setEditing("active", false)}>
              Cancel
            </LinkButton>
            <Switch>
              <Match when={props.new}>
                <Button type="submit" color="primary">
                  Add Environment
                </Button>
              </Match>
              <Match when={true}>
                <Button type="submit" color="success">
                  Update
                </Button>
              </Match>
            </Switch>
          </TargetFormRowControls>
        </Form>
      </TargetFormRoot>
    );
  }

  function addBranchConfig() {
    reset(putForm);
    setValues(putForm, {
      env: [],
    });
    setEditing("active", true);
    setEditing("id", undefined);
  }

  function addPrConfig() {
    reset(putForm);
    setValues(putForm, {
      stagePattern: "pr-*",
      env: [],
    });
    setEditing("active", true);
    setEditing("id", undefined);
  }

  return (
    <>
      <Header app={app.app.name} />
      <PageHeader>
        <Row space="5" vertical="center">
          <Link href="../">
            <TabTitle size="sm">Stages</TabTitle>
          </Link>
          <Link href="../autodeploy">
            <TabTitle size="sm" count={latestRunError.value ? "•" : ""}>
              Autodeploy
            </TabTitle>
          </Link>
          <Link href="">
            <TabTitle size="sm">Settings</TabTitle>
          </Link>
        </Row>
      </PageHeader>
      <SettingsRoot>
        <Stack space={PANEL_HEADER_SPACE}>
          <Text size="xl" weight="medium">
            {app.app.name}
          </Text>
          <Text size="base" color="dimmed">
            View and manage your app's settings
          </Text>
        </Stack>
        <Divider />
        <Stack space={PANEL_CONTENT_SPACE} horizontal="start" id="repo">
          <Stack space={PANEL_HEADER_SPACE}>
            <Text size="lg" weight="medium">
              Autodeploy
            </Text>
            <Text size="sm" color="dimmed">
              Push to your GitHub repo to auto-deploy your app
            </Text>
          </Stack>
          <GitRepoRoot>
            <Switch>
              <Match when={!overrideGithub() && needsGithub.value}>
                <GitOrgError danger={!!appRepo.value}>
                  <GitOrgErrorCopy>
                    <Show
                      fallback="Reconnect your GitHub organization"
                      when={!appRepo.value}
                    >
                      Start by connecting to your GitHub organization
                    </Show>
                  </GitOrgErrorCopy>
                  <form
                    action={import.meta.env.VITE_API_URL + "/github/connect"}
                    method="get"
                    target="newWindow"
                  >
                    <Button type="submit" color="github">
                      <ButtonIcon>
                        <IconGitHub />
                      </ButtonIcon>
                      Connect GitHub
                    </Button>
                    <input type="hidden" name="provider" value="github" />
                    <input
                      type="hidden"
                      name="workspaceID"
                      value={workspace().id}
                    />
                    <input
                      type="hidden"
                      name="token"
                      value={auth.current.token}
                    />
                  </form>
                </GitOrgError>
              </Match>

              <Match when={appRepo.value}>
                {(_item) => {
                  const info = createSubscription(async (tx) => {
                    const repo = await GithubRepoStore.get(
                      tx,
                      appRepo.value!.repoID
                    );
                    const org = await GithubOrgStore.get(tx, repo.githubOrgID);
                    return {
                      org,
                      repo,
                    };
                  });
                  return (
                    <Show when={info.value}>
                      <GitRepoPanel>
                        <GitRepoPanelRow>
                          <Row space="2">
                            <GitRepoIcon>
                              <IconGitHub width="32" height="32" />
                            </GitRepoIcon>
                            <Stack space="1">
                              <GitRepoLink
                                target="_blank"
                                href={githubRepo(
                                  info.value!.org.login,
                                  info.value!.repo.name
                                )}
                              >
                                {info.value!.org.login}
                                <GitRepoLinkSeparator>/</GitRepoLinkSeparator>
                                {info.value!.repo.name}
                              </GitRepoLink>
                            </Stack>
                          </Row>
                          <Button
                            color="danger"
                            onClick={() => {
                              if (
                                !confirm(
                                  "Are you sure you want to disconnect from this repo?"
                                )
                              )
                                return;
                              rep().mutate.app_repo_disconnect(
                                appRepo.value!.id
                              );
                            }}
                          >
                            Disconnect
                          </Button>
                        </GitRepoPanelRow>
                      </GitRepoPanel>
                      <TargetsRoot>
                        <TargetHeader>
                          <TargetHeaderCopy>Environments</TargetHeaderCopy>
                        </TargetHeader>
                        <div>
                          <For
                            each={pipe(
                              runConfigs.value,
                              sortBy((val) => val.stagePattern.length)
                            )}
                          >
                            {(config) => (
                              <>
                                <Target config={config} />
                                <Show when={editing.active && editing.id === config.id}>
                                  <TargetForm />
                                </Show>
                              </>
                            )}
                          </For>
                          <Show when={editing.active && !editing.id}>
                            <TargetFormRoot>
                              <TargetFormHeader>
                                <TargetFormHeaderCopy new>
                                  Add new environment
                                </TargetFormHeaderCopy>
                              </TargetFormHeader>
                            </TargetFormRoot>
                            <TargetForm new />
                          </Show>
                          <Show when={!editing.active || editing.id}>
                            <TargetsEmpty>
                              <Row>
                                <LinkButton
                                  onClick={() => {
                                    addBranchConfig();
                                  }}
                                >
                                  <TargetsEmptyIcon>
                                    <IconAdd width="10" height="10" />
                                  </TargetsEmptyIcon>
                                  Branch environment
                                </LinkButton>
                                <Show
                                  when={
                                    !runConfigs.value.find((c) =>
                                      c.stagePattern.startsWith("pr-")
                                    )
                                  }
                                >
                                  <TargetsEmptySeparator />
                                  <LinkButton
                                    onClick={() => {
                                      addPrConfig();
                                    }}
                                  >
                                    <TargetsEmptyIcon>
                                      <IconAdd width="10" height="10" />
                                    </TargetsEmptyIcon>
                                    PR environment
                                  </LinkButton>
                                </Show>
                              </Row>
                            </TargetsEmpty>
                          </Show>
                        </div>
                      </TargetsRoot>
                    </Show>
                  );
                }}
              </Match>

              <Match when={true}>
                {(_val) => {
                  const [repo, setRepo] = createSignal<string>();
                  const repos = createSubscription(GithubRepoStore.all, []);
                  const orgs = createSubscription(GithubOrgStore.all, []);
                  const activeOrgs = createMemo(
                    () =>
                      new Set(
                        orgs.value
                          .filter((org) => !org.time.disconnected)
                          .map((org) => org.id)
                      )
                  );
                  const sortedRepos = createMemo(() =>
                    pipe(
                      repos.value,
                      filter((repo) => activeOrgs().has(repo.githubOrgID)),
                      map((repo) => ({
                        label: repo.name,
                        value: repo.id,
                      })),
                      sortBy((repo) => repo.label)
                    )
                  );
                  const empty = createMemo(() => sortedRepos().length === 0);
                  return (
                    <SelectRepoRoot>
                      <FormField
                        class={selectRepo}
                        hint={
                          empty() ? (
                            <>
                              Try{" "}
                              <Link href="../../settings#github">
                                connecting to a different organization
                              </Link>
                            </>
                          ) : undefined
                        }
                      >
                        <Select
                          name={SELECT_REPO_NAME}
                          disabled={empty()}
                          onChange={(e) => setRepo(e.currentTarget.value)}
                          placeholder={
                            sortedRepos().length === 0
                              ? "No repos found"
                              : "Select a repo..."
                          }
                          options={sortedRepos()}
                        />
                      </FormField>
                      <Button
                        disabled={empty() || !repo()}
                        onClick={() => {
                          rep().mutate.app_repo_connect({
                            id: createId(),
                            appID: app.app.id,
                            type: "github",
                            repoID: repo()!,
                          });
                        }}
                      >
                        Select
                      </Button>
                    </SelectRepoRoot>
                  );
                }}
              </Match>
            </Switch>
          </GitRepoRoot>
        </Stack>
      </SettingsRoot>
    </>
  );
}
