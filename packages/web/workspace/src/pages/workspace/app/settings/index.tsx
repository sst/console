import { DateTime } from "luxon";
import {
  AppRepoStore,
  AppStore,
  GithubOrgStore,
  GithubRepoStore,
} from "$/data/app";
import { UserStore } from "$/data/user";
import { AccountStore } from "$/data/aws";
import { StageStore } from "$/data/stage";
import { PRICING_PLAN, UsageStore } from "$/data/usage";
import { useAuth, useCurrentUser } from "$/providers/auth";
import { useStorage } from "$/providers/account";
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
} from "$/ui";
import { Fullscreen } from "$/ui/layout";
import { Dropdown } from "$/ui/dropdown";
import {
  IconArrowPath,
  IconChevronRight,
  IconEllipsisVertical,
  IconExclamationTriangle,
} from "$/ui/icons";
import { AvatarInitialsIcon } from "$/ui/avatar-icon";
import { Syncing } from "$/ui/loader";
import { IconApp, IconArrowPathSpin } from "$/ui/icons/custom";
import type { Stage } from "@console/core/app";
import type { Account } from "@console/core/aws/account";
import { styled } from "@macaron-css/solid";
import { Link, useNavigate, useSearchParams } from "@solidjs/router";
import {
  For,
  Match,
  Show,
  Switch,
  createSignal,
  createEffect,
  createMemo,
} from "solid-js";
import { useLocalContext } from "$/providers/local";
import { filter, flatMap, groupBy, map, pipe, sortBy, toPairs } from "remeda";
import { useFlags } from "$/providers/flags";
import { User } from "@console/core/user";
import { useAppContext } from "../context";
import { createId } from "@paralleldrive/cuid2";

export function Settings() {
  const rep = useReplicache();
  const app = useAppContext();
  const githubRepos = GithubRepoStore.all.watch(rep, () => []);
  const appRepo = AppRepoStore.all.watch(
    rep,
    () => [],
    (all) => all.at(0)
  );
  const connectedRepo = createMemo(() =>
    githubRepos().find((repo) => repo.repoID === appRepo()?.source.repoID)
  );
  const connectedRepoOrg = GithubOrgStore.all.watch(
    rep,
    () => [],
    (orgs) => orgs.find((org) => org.orgID === connectedRepo()?.orgID)
  );

  return (
    <>
      <h1>App Settings: {app.app.name}</h1>
      <hr />
      <h1>Repo</h1>
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
