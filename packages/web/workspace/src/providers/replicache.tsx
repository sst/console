import { Replicache, ReadTransaction, WriteTransaction } from "replicache";
import {
  ParentProps,
  Show,
  batch,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  useContext,
} from "solid-js";
import { Splash } from "$/ui";
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
    pullURL: import.meta.env.VITE_API_URL + "/replicache/pull1",
    pushURL: import.meta.env.VITE_API_URL + "/replicache/push1",
    pullInterval: 60 * 1000,
    mutators,
  });

  replicache.puller = async (req) => {
    const result = await fetch(replicache.pullURL, {
      headers: {
        "x-sst-workspace": workspaceID,
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(req),
      method: "POST",
    });
    return {
      response: await result.json(),
      httpRequestInfo: {
        httpStatusCode: result.status,
        errorMessage: result.statusText,
      },
    };
  };

  replicache.pusher = async (req) => {
    const result = await fetch(replicache.pushURL, {
      headers: {
        "x-sst-workspace": workspaceID,
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(req),
      method: "POST",
    });
    return {
      response: await result.json(),
      httpRequestInfo: {
        httpStatusCode: result.status,
        errorMessage: result.statusText,
      },
    };
  };

  return replicache;
}

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
    <Show when={rep() && init()} fallback={<Splash />}>
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
          setStore(reconcile({ result: structuredClone(val) }));
        },
      }
    );
  });

  onCleanup(() => {
    if (unsubscribe) unsubscribe();
  });

  return () => store.result as R | D;
}

export function define<
  T extends Record<string, any>,
  Get extends (arg: any) => string[] = (arg: any) => string[]
>(input: { get: Get; scan: () => string[] }) {
  const result = {
    watch: {
      get: (rep: () => Replicache, cb: () => Parameters<Get>[0]) => {
        return createGet<T>(() => result.path.get(cb()), rep);
      },
      scan: (rep: () => Replicache, filter?: (value: T) => boolean) => {
        return createScan<T>(
          () => result.path.scan(),
          rep,
          filter ? (values) => values.filter(filter) : undefined
        );
      },
      find: (rep: () => Replicache, find: (value: T) => boolean) => {
        const filtered = createScan<T>(
          () => result.path.scan(),
          rep,
          (values) => [values.find(find)!]
        );

        return createMemo(() => filtered().at(0));
      },
    },
    path: {
      get: (args: Parameters<Get>[0]) => {
        const path = input.get(args);
        return `/` + path.join("/");
      },
      scan: () => {
        const path = input.scan();
        return `/` + path.join("/");
      },
    },
    async get(tx: ReadTransaction, args: Parameters<Get>[0]) {
      const item = await tx.get(result.path.get(args));
      return item as T | undefined;
    },
    async set(
      tx: WriteTransaction,
      args: Parameters<Get>[0],
      item: Partial<T>
    ) {
      await tx.put(result.path.get(args), item as any);
    },
  };
  return result;
}

export function createGet<T extends any>(
  p: () => string,
  replicache: () => Replicache
) {
  let unsubscribe: () => void;

  const [data, setData] = createStore({
    value: undefined as T | undefined,
  });
  const [ready, setReady] = createSignal(false);

  createEffect(() => {
    if (unsubscribe) unsubscribe();
    const path = p();
    batch(() => {
      setData("value", undefined);
      setReady(false);
    });
    const rep = replicache();

    unsubscribe = rep.experimentalWatch(
      (diffs) => {
        batch(() => {
          for (const diff of diffs) {
            if (diff.op === "add") {
              setData("value", structuredClone(diff.newValue) as T);
            }
            if (diff.op === "change") {
              setData("value", reconcile(structuredClone(diff.newValue) as T));
            }
            if (diff.op === "del") setData("value", undefined);
          }
          setReady(true);
        });
        console.log(diffs);
      },
      {
        prefix: path,
        initialValuesInFirstDiff: true,
      }
    );
  });

  const result = () => data.value;
  Object.defineProperty(result, "ready", { get: ready });

  onCleanup(() => {
    if (unsubscribe) unsubscribe();
  });

  return result as {
    (): T;
    ready: boolean;
  };
}

export function createScan<T extends any>(
  p: () => string,
  replicache: () => Replicache,
  refine?: (values: T[]) => T[]
) {
  let unsubscribe: () => void;

  const [data, setData] = createStore<T[]>([]);
  const [ready, setReady] = createSignal(false);
  const pointers = new Map<string, number>();

  createEffect(() => {
    if (unsubscribe) unsubscribe();
    const path = p();
    batch(() => {
      setReady(false);
      setData([]);
    });
    const rep = replicache();

    unsubscribe = rep.experimentalWatch(
      (diffs) => {
        batch(() => {
          // Faster set if we haven't seen any diffs yet.
          if (!ready()) {
            const values: T[] = [];
            for (const diff of diffs) {
              if (diff.op === "add") {
                const index = values.push(structuredClone(diff.newValue) as T);
                pointers.set(diff.key, index - 1);
              }
            }
            setData(values);
            setReady(true);
            return;
          }
          for (const diff of diffs) {
            if (diff.op === "add") {
              setData(
                produce((d) => {
                  const index = d.push(structuredClone(diff.newValue) as T);
                  pointers.set(diff.key, index - 1);
                })
              );
            }
            if (diff.op === "change") {
              setData(
                pointers.get(diff.key)!,
                reconcile(structuredClone(diff.newValue) as T)
              );
            }
            if (diff.op === "del") {
              setData(
                produce((d) => {
                  d.splice(pointers.get(diff.key)!, 1);
                  pointers.delete(diff.key);
                })
              );
            }
          }
          setReady(true);
        });
      },
      {
        prefix: path,
        initialValuesInFirstDiff: true,
      }
    );
  });

  const result = createMemo(() => (refine ? refine(data) : data));
  Object.defineProperty(result, "ready", { get: ready });

  onCleanup(() => {
    if (unsubscribe) unsubscribe();
  });

  return result as {
    (): T[];
    ready: boolean;
  };
}
