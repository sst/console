import {
  RunEnvStore,
  AppRepoStore,
  GithubOrgStore,
  GithubRepoStore,
} from "$/data/app";
import {
  theme,
  utility,
  Row,
  Text,
  Stack,
  Input,
  Grower,
  Button,
  FormField,
  ButtonIcon,
  LinkButton,
} from "$/ui";
import { Select } from "$/ui/select";
import { Dropdown } from "$/ui/dropdown";
import {
  PANEL_HEADER_SPACE,
  PANEL_CONTENT_SPACE,
  SettingsRoot,
  Divider,
} from "../../settings";
import { DateTime } from "luxon";
import { Header } from "../../header";
import { Link } from "@solidjs/router";
import { useAppContext } from "../context";
import { style } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { createId } from "@paralleldrive/cuid2";
import { Trigger } from "@console/core/run/run.sql";
import { minLength, object, string } from "valibot";
import { formatCommit, formatSinceTime } from "$/common/format";
import { For, Match, Show, Switch, createMemo } from "solid-js";
import { IconEllipsisHorizontal, IconEllipsisVertical } from "$/ui/icons";
import { useReplicache, createSubscription } from "$/providers/replicache";
import {
  githubPr,
  githubRepo,
  githubBranch,
  githubCommit,
} from "$/common/url-builder";
import { valiForm, toCustom, createForm, getValue } from "@modular-forms/solid";
import {
  IconPr,
  IconAdd,
  IconGit,
  IconStage,
  IconCommit,
  IconGitHub,
  IconSubRight,
} from "$/ui/icons/custom";

const HEADER_HEIGHT = 50;

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

const EventRoot = styled("div", {
  base: {
    ...utility.row(3),
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: theme.borderRadius,
    padding: `${theme.space[4]} ${theme.space[5]}`,
    background: theme.color.background.surface,
  },
});

const EventResult = styled("div", {
  base: {
    ...utility.row(0),
    paddingLeft: 5,
    gap: 3,
    alignItems: "center",
  },
});

const EventResultIcon = styled("div", {
  base: {
    width: 14,
    height: 14,
    lineHeight: 1,
    opacity: theme.iconOpacity,
  },
  variants: {
    status: {
      success: {
        color: theme.color.text.dimmed.surface,
      },
      skipped: {
        color: theme.color.text.secondary.surface,
      },
      error: {
        color: `hsla(${theme.color.base.red}, 100%)`,
      },
    },
  },
});

const EventResultCopy = styled("span", {
  base: {
    lineHeight: "normal",
    fontSize: theme.font.size.sm,
  },
  variants: {
    status: {
      success: {
        color: theme.color.text.dimmed.surface,
      },
      error: {
        color: `hsla(${theme.color.base.red}, 100%)`,
      },
    },
  },
});

const EventRight = styled("div", {
  base: {
    ...utility.stack(2.5),
    alignItems: "flex-end",
  },
});

const EventLabel = styled("span", {
  base: {
    ...utility.text.label,
    fontSize: theme.font.size.mono_xs,
    color: theme.color.text.dimmed.surface,
  },
});

const EventTime = styled("span", {
  base: {
    color: theme.color.text.dimmed.surface,
    fontSize: theme.font.size.sm,
  },
});

const EventCommit = styled("div", {
  base: {
    ...utility.row(2),
    alignItems: "center",
  },
});

const EventCommitLink = styled("a", {
  base: {
    lineHeight: "normal",
    fontFamily: theme.font.family.code,
    fontSize: theme.font.size.mono_base,
    color: theme.color.text.secondary.surface,
    fontWeight: theme.font.weight.medium,
    ":hover": {
      color: theme.color.text.primary.surface,
    },
  },
});

const EventCommitIcon = styled("span", {
  base: {
    paddingRight: 4,
    lineHeight: 0,
    verticalAlign: -3,
    opacity: theme.iconOpacity,
    color: theme.color.text.secondary.surface,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${EventCommitLink}:hover &`]: {
        color: theme.color.text.primary.surface,
      },
    },
  },
});

const EventBranchLink = styled("a", {
  base: {
    lineHeight: "normal",
    fontSize: theme.font.size.sm,
    color: theme.color.text.dimmed.surface,
    ":hover": {
      color: theme.color.text.secondary.surface,
    },
  },
});

const EventBranchIcon = styled("span", {
  base: {
    paddingRight: 2,
    verticalAlign: -2,
    opacity: theme.iconOpacity,
    color: theme.color.text.dimmed.surface,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${EventBranchLink}:hover &`]: {
        color: theme.color.text.secondary.surface,
      },
    },
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
    height: 180,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.borderRadius,
    border: `2px dashed ${theme.color.divider.base}`,
  },
});

const TargetsEmptyIcon = styled("span", {
  base: {
    lineHeight: 0,
    paddingRight: 6,
    opacity: theme.iconOpacity,
  },
});

const TargetFormRoot = styled("div", {
  base: {
    borderWidth: "1px 1px 0 1px",
    borderStyle: "solid",
    borderColor: theme.color.divider.base,
    selectors: {
      "&:first-child": {
        borderRadius: `${theme.borderRadius} ${theme.borderRadius} 0 0`,
      },
      "&:last-child": {
        borderRadius: `0 0 ${theme.borderRadius} ${theme.borderRadius}`,
        borderBottomWidth: 1,
      },
    },
  },
});

const TargetFormHeader = styled("div", {
  base: {
    ...utility.row(2),
    height: HEADER_HEIGHT,
    alignItems: "center",
    justifyContent: "space-between",
    padding: `0 ${theme.space[3]} 0 ${theme.space[5]}`,
    backgroundColor: theme.color.background.surface,
    borderBottom: `1px solid ${theme.color.divider.surface}`,
    selectors: {
      "&:last-child": {
        borderBottomWidth: 0,
      },
    },
  },
});

const TargetAddIcon = styled("span", {
  base: {
    paddingRight: 6,
  },
});

const TargetFormHeaderCopy = styled("div", {
  base: {
    fontWeight: theme.font.weight.medium,
  },
});

const TargetFormRow = styled("div", {
  base: {
    ...utility.row(4),
    alignItems: "flex-start",
    justifyContent: "center",
    padding: `${theme.space[6]} ${theme.space[5]}`,
    borderBottom: `1px solid ${theme.color.divider.base}`,
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
    color: theme.color.text.primary.base,
    fontSize: theme.font.size.mono_sm,
  },
});

const TargetFormFieldLabelDesc = styled("span", {
  base: {
    color: theme.color.text.dimmed.base,
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

export function Settings() {
  const rep = useReplicache();
  const app = useAppContext();
  const repoInfo = createSubscription(async (tx) => {
    const appRepo = await AppRepoStore.forApp(tx, app.app.id);
    const ghRepo = (await GithubRepoStore.all(tx)).find(
      (repo) => repo.repoID === appRepo[0]?.repoID
    );
    const ghRepoOrg = await GithubOrgStore.get(tx, ghRepo?.githubOrgID!);
    const runEnvs = await RunEnvStore.forApp(tx, app.app.id);
    return { appRepo, ghRepo, ghRepoOrg, runEnvs };
  });

  const appRepo = () => repoInfo.value?.appRepo[0];

  const lastEvent = createMemo(() => {
    const ev = appRepo()?.lastEvent;

    if (!appRepo() || !ev) {
      return;
    }

    const repoURL = githubRepo(ev.repo.owner, ev.repo.repo);
    const uri = ev.type === "push"
      ? githubBranch(repoURL, ev.branch)
      : githubPr(repoURL, ev.number);
    const branch = ev.type === "push" ? ev.branch : `pr#${ev.number}`;
    const commit = ev.commit.id;

    return { repoURL, uri, branch, commit };
  });

  function LastEvent() {
    return (
      <EventRoot>
        <Stack space="2.5">
          <EventCommit>
            <EventCommitLink
              target="_blank"
              href={githubCommit(lastEvent()!.repoURL, lastEvent()!.commit)}
            >
              <EventCommitIcon>
                <IconCommit width="16" height="16" />
              </EventCommitIcon>
              {formatCommit(lastEvent()!.commit)}
            </EventCommitLink>
            <EventBranchLink target="_blank" href={lastEvent()!.uri}>
              <EventBranchIcon>
                <Switch>
                  <Match when={appRepo()!.lastEvent!.type === "pull_request"}>
                    <IconPr width="12" height="12" />
                  </Match>
                  <Match when={true}>
                    <IconGit width="12" height="12" />
                  </Match>
                </Switch>
              </EventBranchIcon>
              {lastEvent()!.branch}
            </EventBranchLink>
          </EventCommit>
          <EventResult>
            <Switch>
              <Match when={appRepo()?.lastEventStatus}>
                <EventResultIcon status="error">
                  <IconSubRight />
                </EventResultIcon>
                <EventResultCopy status="error">
                  {appRepo()?.lastEventStatus}
                </EventResultCopy>
              </Match>
              <Match when={true}>
                <EventResultIcon status="success">
                  <IconSubRight />
                </EventResultIcon>
                <EventResultCopy status="success">Deployed</EventResultCopy>
              </Match>
            </Switch>
          </EventResult>
        </Stack>
        <EventRight>
          <EventLabel>Last Commit</EventLabel>
          <EventTime
            title={DateTime.fromISO(appRepo()!.time.lastEvent!).toLocaleString(
              DateTime.DATETIME_FULL
            )}
          >
            {formatSinceTime(
              DateTime.fromISO(appRepo()!.time.lastEvent!).toSQL()!
            )}
          </EventTime>
        </EventRight>
      </EventRoot>
    );
  }

  function Targets() {
    const empty = false;
    return (
      <TargetsRoot>
        <TargetHeader>
          <TargetHeaderCopy>
            Deployment Targets
          </TargetHeaderCopy>
          <LinkButton>
            <TargetAddIcon>
              <IconAdd width="10" height="10" />
            </TargetAddIcon>
            Add a new target
          </LinkButton>
        </TargetHeader>
        <div>
          <Target />
          <TargetForm />
          <TargetForm new />
          <Show when={empty}>
            <TargetsEmpty>
              <LinkButton>
                <TargetsEmptyIcon>
                  <IconAdd width="10" height="10" />
                </TargetsEmptyIcon>
                Add a deployment target
              </LinkButton>
            </TargetsEmpty>
          </Show>
        </div>
      </TargetsRoot>
    );
  }

  function Target() {
    return (
      <TargetFormRoot>
        <TargetFormHeader>
          <TargetFormHeaderCopy>staging</TargetFormHeaderCopy>
          <Dropdown
            size="sm"
            icon={<IconEllipsisVertical width={18} height={18} />}
          >
            <Dropdown.Item>Edit target</Dropdown.Item>
            <Dropdown.Item>Duplicate target</Dropdown.Item>
            <Dropdown.Seperator />
            <Dropdown.Item>Remove target</Dropdown.Item>
          </Dropdown>
        </TargetFormHeader>
      </TargetFormRoot>
    );
  }

  interface TargetProps {
    new?: boolean;
  }
  function TargetForm(props: TargetProps) {
    return (
      <TargetFormRoot>
        <TargetFormHeader>
          <Switch>
            <Match when={props.new}>
              <TargetFormHeaderCopy>Add a new target</TargetFormHeaderCopy>
            </Match>
            <Match when={true}>
              <TargetFormHeaderCopy>production</TargetFormHeaderCopy>
              <Dropdown
                size="sm"
                icon={<IconEllipsisVertical width={18} height={18} />}
              >
                <Dropdown.Item>Duplicate target</Dropdown.Item>
                <Dropdown.Seperator />
                <Dropdown.Item>Remove target</Dropdown.Item>
              </Dropdown>
            </Match>
          </Switch>
        </TargetFormHeader>
        <TargetFormRow>
          <TargetFormFieldLabel>
            <TargetFormFieldLabelCopy>Stage</TargetFormFieldLabelCopy>
            <TargetFormFieldLabelDesc>
              The stage that's being deployed.
            </TargetFormFieldLabelDesc>
          </TargetFormFieldLabel>
          <TargetFormField>
            <FormField hint="Accepts glob patterns." class={targetFormFieldFlex}>
              <Input placeholder="production" type="text" />
            </FormField>
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
            <FormField
              class={targetFormFieldFlex}
              hint={
                <TargetAddAccountLink href="/">
                  Connect another AWS account
                </TargetAddAccountLink>
              }
            >
              <Select
                options={[
                  {
                    value: "917397401067",
                    label: "917397401067",
                  },
                ]}
              />
            </FormField>
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
            <Switch>
              <Match when={props.new}>
                <TargetEnvVar first />
              </Match>
              <Match when={true}>
                <TargetEnvVar first key="key1" value="value1" />
                <TargetEnvVar key="key2" value="value2" />
              </Match>
            </Switch>
            <TargetAddVarLink>
              <TargetAddVarIcon>
                <IconAdd width="10" height="10" />
              </TargetAddVarIcon>
              Add another variable
            </TargetAddVarLink>
          </TargetFormFieldStack>
        </TargetFormRow>
        <TargetFormRowControls>
          <LinkButton>Cancel</LinkButton>
          <Switch>
            <Match when={props.new}>
              <Button color="primary">Add Target</Button>
            </Match>
            <Match when={true}>
              <Button color="success">Update Target</Button>
            </Match>
          </Switch>
        </TargetFormRowControls>
      </TargetFormRoot>
    );
  }

  interface TargetEnvVarProps {
    key?: string;
    value?: string;
    first?: boolean;
  }
  function TargetEnvVar(props: TargetEnvVarProps) {
    return (
      <TargetFormField>
        <FormField label={props.first ? "Key" : undefined} class={targetFormFieldFlex}>
          <Input type="text" value={props.key} />
        </FormField>
        <TargetFormFieldCol>
          <FormField label={props.first ? "Value" : undefined} class={targetFormFieldFlex}>
            <Input type="text" value={props.value} />
          </FormField>
          <Dropdown
            size="sm"
            triggerClass={targetFormFieldDropdown}
            icon={<IconEllipsisVertical width={18} height={18} />}
          >
            <Dropdown.Item>Copy value</Dropdown.Item>
            <Dropdown.Seperator />
            <Dropdown.Item
            >
              Remove variable
            </Dropdown.Item>
          </Dropdown>
        </TargetFormFieldCol>
      </TargetFormField>
    );
  }

  return (
    <Show when={repoInfo.value}>
      <Header app={app.app.name} />
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
              Deploy
            </Text>
            <Text size="sm" color="dimmed">
              Push to GitHub repo to deploy your app
            </Text>
          </Stack>
          <Switch>
            <Match when={repoInfo.value?.ghRepoOrg}>
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
                          repoInfo.value!.ghRepoOrg!.login,
                          repoInfo.value!.ghRepo!.name!
                        )}
                      >
                        {repoInfo.value!.ghRepoOrg!.login}
                        <GitRepoLinkSeparator>/</GitRepoLinkSeparator>
                        {repoInfo.value!.ghRepo!.name}
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
                        repoInfo.value!.appRepo[0]!.id
                      );
                    }}
                  >
                    Disconnect
                  </Button>
                </GitRepoPanelRow>
                <Show when={lastEvent()}>
                  <LastEvent />
                </Show>
              </GitRepoPanel>
              <Targets />
            </Match>
            <Match when={true}>
              <Button color="github">
                <ButtonIcon>
                  <IconGitHub />
                </ButtonIcon>
                Connect Repo
              </Button>
            </Match>
          </Switch>
        </Stack>
        <Divider />
        <RepoInfo />
        <Divider />
        <Env />
      </SettingsRoot>
    </Show>
  );
}

const PutForm = object({
  stage: string([minLength(0)]),
  key: string([minLength(1)]),
  value: string([minLength(1)]),
});

function Env() {
  const rep = useReplicache();
  const app = useAppContext();
  const envs = RunEnvStore.all.watch(rep, () => []);
  const stageNames = createMemo(() => {
    const names = new Set<string>();
    envs()
      .filter((env) => env.stageName !== "")
      .forEach((env) => names.add(env.stageName));
    return Array.from(names);
  });
  const [putForm, { Form, Field }] = createForm({
    validate: valiForm(PutForm),
  });
  return (
    <>
      <h1>Environment Variables</h1>
      <For each={envs().filter((env) => env.stageName === "")}>
        {(env) => (
          <Row flex space="4" vertical="start">
            <Text>{env.key}</Text>
            <Text>{env.value}</Text>
            <Button
              color="secondary"
              onClick={(e) => {
                rep().mutate.env_remove(env.id);
              }}
            >
              Remove
            </Button>
          </Row>
        )}
      </For>
      <For each={stageNames()}>
        {(stageName) => (
          <>
            <h2>{stageName}</h2>
            <For each={envs().filter((env) => env.stageName === stageName)}>
              {(env) => (
                <Row flex space="4" vertical="start">
                  <Text>{env.key}</Text>
                  <Text>{env.value}</Text>
                  <Button
                    color="secondary"
                    onClick={(e) => {
                      rep().mutate.env_remove(env.id);
                    }}
                  >
                    Remove
                  </Button>
                </Row>
              )}
            </For>
          </>
        )}
      </For>
      <Row flex space="4" vertical="start">
        <Field
          name="stage"
          transform={toCustom(
            (value) => {
              if (!value) return "";
              return value.trim();
            },
            {
              on: "blur",
            }
          )}
        >
          {(field, props) => (
            <FormField>
              <Input {...props} value={field.value} placeholder="stage name" />
            </FormField>
          )}
        </Field>
        <Field
          name="key"
          transform={toCustom(
            (value) => {
              if (!value) return "";
              return value.trim();
            },
            {
              on: "blur",
            }
          )}
        >
          {(field, props) => (
            <FormField>
              <Input {...props} value={field.value} placeholder="env name" />
            </FormField>
          )}
        </Field>
        <Field
          name="value"
          transform={toCustom(
            (value) => {
              if (!value) return "";
              return value.trim();
            },
            {
              on: "blur",
            }
          )}
        >
          {(field, props) => (
            <FormField>
              <Input {...props} value={field.value} placeholder="env value" />
            </FormField>
          )}
        </Field>
        <Button
          color="secondary"
          onClick={(e) => {
            rep().mutate.env_create({
              id: createId(),
              appID: app.app.id,
              stageName: getValue(putForm, "stage")!,
              key: getValue(putForm, "key")!,
              value: getValue(putForm, "value")!,
            });
          }}
        >
          Add
        </Button>
      </Row>
    </>
  );
}

function RepoInfo() {
  const rep = useReplicache();
  const app = useAppContext();
  const githubRepos = GithubRepoStore.all.watch(rep, () => []);
  const appRepo = AppRepoStore.all.watch(
    rep,
    () => [],
    (all) => all.at(0)
  );
  const connectedRepo = createMemo(() =>
    githubRepos().find((repo) => repo.repoID === appRepo()?.repoID)
  );
  const connectedRepoOrg = GithubOrgStore.all.watch(
    rep,
    () => [],
    (orgs) => orgs.find((org) => org.id === connectedRepo()?.githubOrgID)
  );

  return (
    <>
      <h3>Repo</h3>
      <Show
        when={appRepo()}
        fallback={
          <>
            <p>Not connected to a repo. Select one:</p>
            <ul>
              <For each={githubRepos()}>
                {(repo) => (
                  <li>
                    <Button
                      color="secondary"
                      onClick={(e) => {
                        rep().mutate.app_repo_connect({
                          id: createId(),
                          appID: app.app.id,
                          type: "github",
                          repoID: repo.repoID,
                        });
                      }}
                    >
                      {repo.name}
                    </Button>
                  </li>
                )}
              </For>
            </ul>
          </>
        }
      >
        <Text size="sm" color="dimmed">
          Connected to{" "}
          <Text color="dimmed" size="sm" weight="medium">
            {connectedRepoOrg()?.login}/{connectedRepo()?.name}
          </Text>
        </Text>
        <Button
          color="secondary"
          onClick={(e) => {
            rep().mutate.app_repo_disconnect(appRepo()!.id);
          }}
        >
          Disconnect
        </Button>
      </Show>
    </>
  );
}
