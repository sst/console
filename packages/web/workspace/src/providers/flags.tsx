import { createInitializedContext } from "$/common/context";
import { createMemo } from "solid-js";
import { useStorage } from "./account";
import { useAuth } from "./auth";
import { useSearchParams } from "@solidjs/router";

export const { use: useFlags, provider: FlagsProvider } =
  createInitializedContext("FlagsContext", () => {
    const auth = useAuth();
    const storage = useStorage();
    const email = createMemo(() => auth[storage.value.account].session.email);
    const [search] = useSearchParams();
    const internal = createMemo(
      () => email().endsWith("@sst.dev") || search.internal === "true"
    );
    const local = window.location.hostname.includes("localhost");

    return {
      get ionState() {
        return local || internal();
      },
      ready: true,
    };
  });
