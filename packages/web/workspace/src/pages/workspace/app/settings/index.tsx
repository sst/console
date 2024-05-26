import {
  AppRepoStore,
  EnvStore,
  GithubOrgStore,
  GithubRepoStore,
} from "$/data/app";
import { useReplicache } from "$/providers/replicache";
import { Row, Text, Button, FormField, Input } from "$/ui";
import { For, Show, createMemo } from "solid-js";
import { useAppContext } from "../context";
import { createId } from "@paralleldrive/cuid2";
import { valiForm, toCustom, createForm, getValue } from "@modular-forms/solid";
import { minLength, object, string } from "valibot";

export function Settings() {
  const rep = useReplicache();
  const app = useAppContext();
  return (
    <>
      <h1>App Settings: {app.app.name}</h1>
      <hr />
      <RepoInfo />
      <hr />
      <Env />
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
    githubRepos().find((repo) => repo.repoID === appRepo()?.source.repoID),
  );
  const connectedRepoOrg = GithubOrgStore.all.watch(
    rep,
    () => [],
    (orgs) => orgs.find((org) => org.orgID === connectedRepo()?.orgID),
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
                          source: {
                            type: "github",
                            repoID: repo.repoID,
                          },
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
