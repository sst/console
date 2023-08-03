import { Replicache, ReadTransaction } from "replicache";
import {
  ParentProps,
  Show,
  batch,
  createContext,
  createEffect,
  createMemo,
  onCleanup,
  onMount,
  useContext,
} from "solid-js";
import { globalKeyframes } from "@macaron-css/core";
import { theme, Fullscreen } from "$/ui";
import { styled } from "@macaron-css/solid";
import { IconApp } from "$/ui/icons/custom";
import { createStore, produce, reconcile } from "solid-js/store";
import { useAuth } from "./auth";
import { Client } from "@console/functions/replicache/framework";
import type { ServerType } from "@console/functions/replicache/server";
import { bus } from "./bus";
import { UserStore } from "$/data/user";
import { LambdaPayloadStore } from "$/data/lambda-payload";
import { LogSearchStore } from "$/data/log-search";

const mutators = new Client<ServerType>()
  .mutation("connect", async (tx, input) => {})
  .mutation("app_stage_sync", async (tx, input) => {})
  .mutation("log_poller_subscribe", async (tx, input) => {})
  .mutation("log_search", async (tx, input) => {
    await LogSearchStore.put(tx, input);
  })
  .mutation("user_create", async (tx, input) => {
    await UserStore.put(tx, {
      id: input.id,
      email: input.email,
      timeCreated: new Date().toISOString(),
    });
  })
  .mutation("user_remove", async (tx, input) => {
    const user = await UserStore.fromID(input)(tx);
    await UserStore.put(tx, {
      ...user,
      timeDeleted: new Date().toISOString(),
    });
  })
  .mutation("function_invoke", async (tx, input) => {})
  .mutation("function_payload_save", async (tx, input) => {
    await LambdaPayloadStore.put(tx, {
      id: input.id,
      name: input.name,
      payload: input.payload,
      key: input.key,
      timeCreated: new Date().toISOString(),
    });
  })
  .mutation("function_payload_remove", async (tx, input) => {
    await LambdaPayloadStore.remove(tx, input);
  })
  .build();

const ReplicacheContext =
  createContext<() => ReturnType<typeof createReplicache>>();

function createReplicache(workspaceID: string, token: string) {
  const replicache = new Replicache({
    name: workspaceID,
    auth: `Bearer ${token}`,
    licenseKey: "l24ea5a24b71247c1b2bb78fa2bca2336",
    pullURL: import.meta.env.VITE_API_URL + "/replicache/pull",
    pushURL: import.meta.env.VITE_API_URL + "/replicache/push",
    pullInterval: 60 * 1000,
    mutators,
  });

  const oldPuller = replicache.puller;
  replicache.puller = (opts) => {
    opts.headers.append("x-sst-workspace", workspaceID);
    return oldPuller(opts);
  };

  const oldPusher = replicache.pusher;
  replicache.pusher = (opts) => {
    opts.headers.append("x-sst-workspace", workspaceID);
    return oldPusher(opts);
  };

  return replicache;
}

globalKeyframes("delayedFadeIn", {
  "0%": {
    opacity: 0,
  },
  "100%": {
    opacity: 1,
  },
});

const LogoIcon = styled("div", {
  base: {
    width: 42,
    height: 42,
    opacity: 0,
    animationDelay: "0.3s",
    animation: "1s delayedFadeIn",
    animationFillMode: "forwards",
    color: theme.color.icon.dimmed,
  },
});

export function ReplicacheProvider(
  props: ParentProps<{ accountID: string; workspaceID: string }>
) {
  const tokens = useAuth();
  const token = createMemo(() => tokens[props.accountID]?.token.token);

  const rep = createMemo((prev) => {
    return createReplicache(props.workspaceID, token()!);
  });

  bus.on("poke", (properties) => {
    if (properties.workspaceID !== props.workspaceID) return;
    rep().pull();
  });

  onCleanup(() => {
    rep().close();
  });

  const init = createSubscription(
    () => (tx) => {
      return tx.get("/init");
    },
    false,
    rep
  );

  return (
    <Show
      when={rep() && init()}
      fallback={
        <Fullscreen>
          <LogoIcon>
            <IconApp />
          </LogoIcon>
        </Fullscreen>
      }
    >
      <ReplicacheContext.Provider value={rep}>
        {props.children}
      </ReplicacheContext.Provider>
    </Show>
  );
}

export function useReplicache() {
  const result = useContext(ReplicacheContext);
  if (!result) {
    throw new Error("useReplicache must be used within a ReplicacheProvider");
  }

  return result;
}

export function createSubscription<R, D = undefined>(
  body: () => (tx: ReadTransaction) => Promise<R>,
  initial?: D,
  replicache?: () => Replicache
) {
  const [store, setStore] = createStore({ result: initial as any });

  let unsubscribe: () => void;

  createEffect(() => {
    if (unsubscribe) unsubscribe();
    setStore({ result: initial as any });

    const r = replicache ? replicache() : useReplicache()();
    unsubscribe = r.subscribe(
      // @ts-expect-error
      body(),
      {
        onData: (val) => {
          setStore(reconcile({ result: val }));
        },
      }
    );
  });

  onCleanup(() => {
    if (unsubscribe) unsubscribe();
  });

  return () => store.result as R | D;
}

export function createWatch<T>(prefix: () => string) {
  const rep = useReplicache();
  let unsubscribe: () => void;

  const [data, setStore] = createStore<Record<string, T>>({});

  createEffect(() => {
    if (unsubscribe) unsubscribe();
    const p = prefix();

    unsubscribe = rep().experimentalWatch(
      (diffs) => {
        batch(() => {
          for (const diff of diffs) {
            const key = diff.key.substring(p.length);
            if (diff.op === "add") setStore(key, diff.newValue as T);
            if (diff.op === "change")
              setStore(key, reconcile(diff.newValue as T));
            if (diff.op === "del") setStore(produce((d) => delete d[key]));
          }
        });
      },
      {
        prefix: p,
        initialValuesInFirstDiff: true,
      }
    );
  });

  return data;
}
