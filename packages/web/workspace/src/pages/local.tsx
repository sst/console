import { WorkspaceStore } from "$/data/workspace";
import { useAuth } from "$/providers/auth";
import { Splash } from "$/ui/splash";
import { useLocalContext } from "$/providers/local";
import { useNavigate } from "@solidjs/router";
import { Replicache } from "replicache";
import { createEffect } from "solid-js";

export function Local() {
  const ctx = useLocalContext();
  const nav = useNavigate();
  createEffect(async () => {
    const { app, stage } = ctx();
    if (!app || !stage) return;
    const auth = useAuth();
    for (const account of Object.values(auth)) {
      const result = await fetch(
        import.meta.env.VITE_API_URL +
          "/rest/local?" +
          new URLSearchParams({
            app,
            stage,
          }).toString(),
        {
          headers: {
            authorization: `Bearer ${account.session.token}`,
            "content-type": "application/json",
          },
        }
      ).then((res) => res.json());
      if (!result.length) continue;
      nav(`/${result[0]}/${app}/${stage}`);
    }
  });

  return <Splash pulse />;
}
