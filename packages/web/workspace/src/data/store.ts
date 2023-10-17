import { ReadTransaction, Replicache, WriteTransaction } from "replicache";
import {
  createSignal,
  createEffect,
  batch,
  onCleanup,
  createMemo,
} from "solid-js";
import { createStore, produce, reconcile, unwrap } from "solid-js/store";

type PathResolver = (...args: any) => string[];

export class Store<
  Get extends PathResolver = never,
  Scanners extends Record<string, PathResolver> = {},
  Item extends any = never
> {
  #get?: PathResolver = undefined;
  #scanners: Record<string, PathResolver> = {};

  public type<Type>() {
    return this as any as Store<Get, Scanners, Type>;
  }

  public scan<Name extends string, Resolver extends PathResolver>(
    name: Name,
    resolver: Resolver
  ) {
    this.#scanners[name] = resolver;
    return this as Store<Get, Scanners & { [name in Name]: Resolver }, Item>;
  }

  public get<Resolver extends PathResolver>(resolver: Resolver) {
    this.#get = resolver;
    return this as any as Store<Resolver, Scanners, Item>;
  }

  public build() {
    const result = {} as any;
    for (const [name, resolver] of Object.entries(this.#scanners)) {
      result[name] = (tx: ReadTransaction, ...args: any[]) => {
        return tx
          .scan({
            prefix: "/" + resolver(...args).join("/"),
          })
          .values()
          .toArray();
      };
      result[name].watch = (
        rep: () => Replicache,
        args: () => any[],
        refiner?: (items: Item[]) => any
      ) => {
        return createScan(
          () => "/" + resolver(...args()).join("/"),
          rep,
          refiner
        );
      };
    }
    result.get = (tx: ReadTransaction, ...args: any[]) => {
      return tx.get("/" + this.#get!(...args).join("/"));
    };
    result.get.watch = (rep: () => Replicache, args: () => any[]) => {
      return createGet(() => "/" + this.#get!(...args()).join("/"), rep);
    };

    result.update = async (
      tx: WriteTransaction,
      id: string,
      updator: (input: any) => void
    ) => {
      const [item] = await tx
        .scan({
          indexName: "id",
          start: {
            key: [id],
          },
        })
        .entries()
        .toArray();
      const [[_, pk], rawValue] = item;
      const value = structuredClone(rawValue);
      if (!value) throw new Error("Not found");
      updator(value as any);
      await tx.put(pk, value as any);
    };
    result.remove = async (tx: WriteTransaction, id: string) => {
      const [item] = await tx
        .scan({
          indexName: "id",
          start: {
            key: [id],
          },
        })
        .entries()
        .toArray();
      const [[_, pk], rawValue] = item;
      const value = structuredClone(rawValue);
      if (!value) throw new Error("Not found");
      await tx.del(pk);
    };
    result.put = async (tx: WriteTransaction, args: any[], item: Item) => {
      await tx.put("/" + this.#get!(...args).join("/"), item as any);
    };
    return result as {
      [name in keyof Scanners]: ((
        tx: ReadTransaction,
        ...args: Parameters<Scanners[name]>
      ) => Promise<Item[]>) & {
        watch: {
          (
            rep: () => Replicache,
            args: () => Parameters<Scanners[name]>
          ): ReturnType<typeof createScan<Item>>;
          <Refiner extends (items: Item[]) => any | undefined>(
            rep: () => Replicache,
            args: () => Parameters<Scanners[name]>,
            refine?: Refiner
          ): (() => ReturnType<Refiner>) & { ready: true };
        };
      };
    } & {
      get: ((
        tx: ReadTransaction,
        ...args: Parameters<Get>
      ) => Promise<Item>) & {
        watch: (
          rep: () => Replicache,
          args: () => Parameters<Get>
        ) => ReturnType<typeof createGet<Item>>;
      };
      update: (
        tx: WriteTransaction,
        id: string,
        updator: (item: Item) => void
      ) => Promise<void>;
      remove: (tx: WriteTransaction, id: string) => Promise<void>;
      put: (
        tx: WriteTransaction,
        args: Parameters<Get>,
        item: Partial<Item>
      ) => Promise<void>;
    };
  }
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
  const keyToIndex = new Map<string, number>();
  const indexToKey = new Map<number, string>();

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
                const value = structuredClone(diff.newValue) as T;
                const index = values.push(value);
                keyToIndex.set(diff.key, index - 1);
                indexToKey.set(index - 1, diff.key);
              }
            }
            setData(values);
            setReady(true);
            return;
          }
          setData(
            produce((state) => {
              for (const diff of diffs) {
                if (diff.op === "add") {
                  const index = state.push(structuredClone(diff.newValue) as T);
                  keyToIndex.set(diff.key, index - 1);
                  indexToKey.set(index - 1, diff.key);
                }
                if (diff.op === "change") {
                  state[keyToIndex.get(diff.key)!] = reconcile(
                    structuredClone(diff.newValue) as T
                  )(structuredClone(diff.oldValue));
                }
                if (diff.op === "del") {
                  const toRemove = keyToIndex.get(diff.key)!;
                  const last = state[state.length - 1];
                  const lastKey = indexToKey.get(state.length - 1)!;

                  state[toRemove] = last;
                  keyToIndex.delete(diff.key);
                  indexToKey.delete(toRemove);

                  keyToIndex.set(lastKey, toRemove);
                  indexToKey.set(toRemove, lastKey);
                  indexToKey.delete(state.length - 1);

                  state.pop();
                }
              }
            })
          );

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

export function createScan2<T extends any>(
  p: () => string,
  replicache: () => Replicache,
  refine?: (values: T[]) => T[]
) {
  let unsubscribe: () => void;

  const itemToKey = new Map<any, string>();
  const [data, setData] = createStore<T[]>([]);
  const [ready, setReady] = createSignal(false);

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
                values.push(diff.newValue as T);
                console.log("setting key", diff.newValue, diff.key);
                itemToKey.set(diff.newValue, diff.key);
              }
            }
            setData(values);
            setReady(true);
            return;
          }
          setData(
            produce((state) => {
              for (const diff of diffs) {
                if (diff.op === "add") {
                  state.push(diff.newValue as T);
                  itemToKey.set(diff.newValue, diff.key);
                }
                if (diff.op === "change") {
                  const index = state.findIndex((item) => {
                    console.log(item, itemToKey.get(unwrap(item)));
                    return itemToKey.get(unwrap(item)) === diff.key;
                  });
                  console.log(
                    "found existing item",
                    itemToKey,
                    index,
                    diff.key
                  );
                  state[index] = diff.newValue as T;
                  itemToKey.set(diff.newValue, diff.key);
                }
                if (diff.op === "del") {
                  const index = state.findIndex(
                    (item) => itemToKey.get(item) === diff.key
                  );
                  state.splice(index, 1);
                }
              }
            })
          );

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
