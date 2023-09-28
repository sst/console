import { createInitializedContext } from "$/common/context";
import { createMemo } from "solid-js";
import { useStorage } from "./account";
import { useAuth } from "./auth";

export const { use: useFlags, provider: FlagsProvider } =
  createInitializedContext("FlagsContext", () => {
    const auth = useAuth();
    const storage = useStorage();
    const email = createMemo(() => auth[storage.value.account].session.email);
    const internal = createMemo(() => email().endsWith("@sst.dev"));
    const local = window.location.hostname.includes("localhost");

    return {
      get alerts() {
        return local || internal();
      },
      ready: true,
    };
  });
