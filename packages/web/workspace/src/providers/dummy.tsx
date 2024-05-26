import { createInitializedContext } from "$/common/context";
import { DummyMode } from "@console/functions/replicache/dummy/data";
import { useSearchParams } from "@solidjs/router";
import { useStorage } from "./account";

export const { use: useDummy, provider: DummyProvider } =
  createInitializedContext("dummy", () => {
    const storage = useStorage();
    const [search] = useSearchParams();
    storage.set("dummy", search.dummy || storage.value.dummy || "base");
    const splits = location.hostname.split(".");
    const isDummy = splits[0] === "dummy" && splits[1] === "localhost";

    const result = () =>
      isDummy ? (storage.value.dummy as DummyMode) : undefined;
    result.ready = true;
    if (isDummy) console.log("dummy mode", storage.value.dummy);
    return result;
  });

export const { use: useDummyConfig, provider: DummyConfigProvider } =
  createInitializedContext("dummyConfig", () => {
    const result = () => ({
      user: "me@example.com",
      local: {
        app: "my-sst-app",
        stage: "local",
      },
    });
    result.ready = true;
    return result;
  });
