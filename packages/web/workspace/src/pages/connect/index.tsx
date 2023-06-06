import { Link, useNavigate, useSearchParams } from "@solidjs/router";
import { createSubscription } from "$/providers/replicache";
import { useAuth } from "$/providers/auth";
import { For } from "solid-js";
import { UserStore } from "../../data/user";
import { WorkspaceStore } from "../../data/workspace";
import { Stack } from "$/ui/layout";
import { setAccount } from "$/data/storage";

export function Connect() {
  const auth = useAuth();
  const [query] = useSearchParams();
  const nav = useNavigate();

  let select!: HTMLSelectElement;

  return (
    <Stack space="4" horizontal="start">
      <label>
        Workspace:{" "}
        <select ref={select}>
          <For each={Object.entries(auth)}>
            {([key, entry]) => {
              const users = createSubscription(
                UserStore.list,
                [],
                () => entry.replicache
              );
              return (
                <For each={users()}>
                  {(user) => {
                    const workspace = createSubscription(
                      () => WorkspaceStore.fromID(user.workspaceID),
                      null,
                      () => entry.replicache
                    );
                    return (
                      <option value={`${key}:${workspace()?.id}`}>
                        User: {user.email} Workspace: {workspace()?.slug}
                      </option>
                    );
                  }}
                </For>
              );
            }}
          </For>
        </select>
      </label>
      <div>Account: {query.aws_account_id}</div>
      <div>App: {query.app}</div>
      <div>Stage: {query.stage}</div>
      <div>Region: {query.region}</div>
      <button
        onClick={async () => {
          const [account, workspace] = select.value.split(":");
          setAccount(account);
          nav(`/${workspace}/connect${location.search}`);
        }}
      >
        Connect
      </button>
    </Stack>
  );
  return (
    <div>
      Which workspace should we connect to?
      <For each={Object.values(auth)}>
        {(entry) => {
          const users = createSubscription(
            UserStore.list,
            [],
            () => entry.replicache
          );
          return (
            <ol>
              <li>{users()[0]?.email}</li>
              <ol>
                <For each={users()}>
                  {(user) => {
                    const workspace = createSubscription(
                      () => WorkspaceStore.fromID(user.workspaceID),
                      null,
                      () => entry.replicache
                    );
                    return (
                      <li>
                        <Link
                          href={`/${entry.token.accountID}/${
                            workspace()?.id
                          }/connect${location.search}`}
                        >
                          {" "}
                          Workspace: {workspace()?.slug}
                        </Link>
                      </li>
                    );
                  }}
                </For>
              </ol>
            </ol>
          );
        }}
      </For>
    </div>
  );
}
