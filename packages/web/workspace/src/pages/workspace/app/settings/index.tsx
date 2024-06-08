import {
  AppRepoStore,
  EnvStore,
  GithubOrgStore,
  GithubRepoStore,
} from "$/data/app";
import { useReplicache, createSubscription } from "$/providers/replicache";
import {
  theme,
  utility,
  Row,
  Text,
  Stack,
  Button,
  ButtonIcon,
  FormField,
  Input,
} from "$/ui";
import { For, Match, Show, Switch, createMemo } from "solid-js";
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

const GitRepoStatus = styled("span", {
  base: {
    color: theme.color.text.dimmed.base,
    fontSize: theme.font.size.sm,
  },
});

export function Settings() {
  const rep = useReplicache();
  const app = useAppContext();
  const repoInfo = createSubscription(async (tx) => {
    const appRepo = await AppRepoStore.forApp(tx, app.app.id);
    const ghRepo = (await GithubRepoStore.all(tx)).find(
      (repo) => repo.repoID === appRepo[0]?.repoID,
    );
    const ghRepoOrg = await GithubOrgStore.get(tx, ghRepo?.githubOrgID!);

    return { appRepo, ghRepo, ghRepoOrg };
  });

  return (
    <Show when={repoInfo}>
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
            <Match when={repoInfo()!.ghRepoOrg}>
              <GitRepoPanel>
                <GitRepoPanelRow>
                  <Row space="2">
                    <GitRepoIcon>
                      <IconGitHub width="32" height="32" />
                    </GitRepoIcon>
                    <Stack space="1">
                      <GitRepoLink
                        target="_blank"
                        href={`https://github.com/${repoInfo()!.ghRepoOrg?.login}/${repoInfo()!.ghRepo?.name}`}
                      >
                        {repoInfo()!.ghRepoOrg?.login}
                        <GitRepoLinkSeparator>/</GitRepoLinkSeparator>
                        {repoInfo()!.ghRepo?.name}
                      </GitRepoLink>
                    </Stack>
                  </Row>
                  <Button
                    color="danger"
                    onClick={() => {
                      if (
                        !confirm(
                          "Are you sure you want to disconnect from this repo?",
                        )
                      )
                        return;
                      rep().mutate.app_repo_disconnect(
                        repoInfo()!.appRepo[0]!.id,
                      );
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
            },
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
            },
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
            },
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
    (all) => all.at(0),
  );
  const connectedRepo = createMemo(() =>
    githubRepos().find((repo) => repo.repoID === appRepo()?.repoID),
  );
  const connectedRepoOrg = GithubOrgStore.all.watch(
    rep,
    () => [],
    (orgs) => orgs.find((org) => org.id === connectedRepo()?.githubOrgID),
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
