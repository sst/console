import { createInitializedContext } from "$/common/context";
import { DummyConfig } from "@console/functions/replicache/dummy/data";
import { useSearchParams } from "@solidjs/router";

export const { use: useDummy, provider: DummyProvider } =
  createInitializedContext("dummy", () => {
    const [search] = useSearchParams();
    const dummy = search.dummy || "base";
    const splits = location.hostname.split(".");
    const value =
      splits[0] === "dummy" && splits[1] === "localhost" ? dummy : undefined;
    const result = () => value as DummyConfig;
    result.ready = true;
    return result;
  });
