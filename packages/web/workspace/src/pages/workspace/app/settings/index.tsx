import {
  AppRepoStore,
  AppStore,
  EnvStore,
  GithubOrgStore,
  GithubRepoStore,
} from "$/data/app";
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
  ButtonIcon,
  FormField,
  Input,
} from "$/ui";
import {
  For,
  Match,
  Show,
  Switch,
  createSignal,
  createEffect,
  createMemo,
} from "solid-js";
import { Header } from "../../header";
import { styled } from "@macaron-css/solid";
import { IconGitHub } from "$/ui/icons/custom";
import {
  PANEL_HEADER_SPACE,
  PANEL_CONTENT_SPACE,
  SettingsRoot,
  Divider,
} from "../../settings";
import { useAppContext } from "../context";
import { createId } from "@paralleldrive/cuid2";
import { valiForm, toCustom, createForm, getValue } from "@modular-forms/solid";
import { minLength, object, string } from "valibot";

const GitRepoPanel = styled("div", {
  base: {
    width: "100%",
    border: `1px solid ${theme.color.divider.base}`,
    borderRadius: theme.borderRadius,
  },
});

const GitRepoPanelRow = styled("div", {
  base: {
    ...utility.row(5),
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${theme.space[4]} ${theme.space[5]}`,
    borderBottom: `1px solid ${theme.color.divider.base}`,
    selectors: {
      "&:last-child": {
        borderBottom: "none",
      },
    },
  },
});

const GitRepoIcon = styled("div", {
  base: {
    marginTop: 1,
    opacity: theme.iconOpacity,
    color: theme.color.text.secondary.base,
  },
});

const GitRepoLink = styled("a", {
  base: {
    color: theme.color.text.primary.base,
    lineHeight: 1.5,
    ":hover": {
      color: theme.color.link.primary.hover,
    },
  },
});

const GitRepoLinkSeparator = styled("span", {
  base: {
    color: theme.color.text.dimmed.base,
    paddingInline: 4,
  },
});

const GitRepoStatus = styled("span", {
  base: {
    ...utility.text.label,
    color: theme.color.text.dimmed.base,
    fontSize: theme.font.size.mono_sm,
  },
});

export function Settings() {
  const rep = useReplicache();
  const app = useAppContext();
  const appRepo = AppRepoStore.forApp.watch(rep, () => [app.app.id]);
  const ghRepo = GithubRepoStore.all.watch(
    rep,
    () => [],
    (repos) => repos.find((repo) => repo.repoID === appRepo()[0]?.repoID)
  );
  const ghRepoOrg = GithubOrgStore.all.watch(
    rep,
    () => [],
    (orgs) => orgs.find((org) => org.id === ghRepo()?.githubOrgID)
  );

  return (
    <>
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
        <Stack space={PANEL_CONTENT_SPACE} horizontal="start" id="billing">
          <Stack space={PANEL_HEADER_SPACE}>
            <Text size="lg" weight="medium">
              Deploy
            </Text>
            <Text size="sm" color="dimmed">
              Push to GitHub repo to deploy your app
            </Text>
          </Stack>
          <Switch>
            <Match when={ghRepoOrg()}>
              <GitRepoPanel>
                <GitRepoPanelRow>
                  <Row space="2">
                    <GitRepoIcon>
                      <IconGitHub width="24" height="24" />
                    </GitRepoIcon>
                    <Stack space="1">
                      <GitRepoLink
                        target="_blank"
                        href={`https://github.com/${ghRepoOrg()?.login}/${
                          ghRepo()?.name
                        }`}
                      >
                        {ghRepoOrg()?.login}
                        <GitRepoLinkSeparator>/</GitRepoLinkSeparator>
                        {ghRepo()?.name}
                      </GitRepoLink>
                      <GitRepoStatus>Connected</GitRepoStatus>
                    </Stack>
                  </Row>
                  <Button
                    color="danger"
                    onClick={() => {
                      rep().mutate.app_repo_disconnect(appRepo()[0]!.id);
                    }}
                  >
                    Disconnect
                  </Button>
                </GitRepoPanelRow>
              </GitRepoPanel>
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
    </>
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
  const envs = EnvStore.all.watch(rep, () => []);
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
