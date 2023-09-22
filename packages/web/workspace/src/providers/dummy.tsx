import { createInitializedContext } from "$/common/context";
import {
  DummyConfig,
  DummyMode,
} from "@console/functions/replicache/dummy/data";
import { useSearchParams } from "@solidjs/router";
import { createGet, useReplicache } from "./replicache";
import { useAuth } from "./auth";
import { createMemo } from "solid-js";
import { useStorage } from "./account";

export const { use: useDummy, provider: DummyProvider } =
  createInitializedContext("dummy", () => {
    const [search] = useSearchParams();
    const dummy = search.dummy || "base";
    const splits = location.hostname.split(".");
    const value =
      splits[0] === "dummy" && splits[1] === "localhost" ? dummy : undefined;
    const auth = useAuth();
    const storage = useStorage();
    const rep = createMemo(() => auth[storage.value.account].replicache);
    const config = createGet<DummyConfig>(() => "/dummyConfig", rep);

    const result = () => value as DummyMode;
    result.ready = true;
    return {
      get ready() {
        if (!dummy) return true;
        return config.ready;
      },
      get mode() {
        return value;
      },
      get config() {
        return config();
      },
    };
  });

export function useDummyConfig() {}
