import { createSubscription } from "$/data/replicache";
import { createContext, useContext } from "solid-js";
import { useParams } from "@solidjs/router";
import { StageStore } from "$/data/stage";
import { AppStore } from "$/data/app";

export const StageContext =
  createContext<ReturnType<typeof createStageContext>>();

export function createStageContext() {
  const params = useParams();
  const app = createSubscription(() => AppStore.fromName(params.appName));
  const stage = createSubscription(() =>
    app()
      ? StageStore.fromName(app()!.id, params.stageName)
      : async () => undefined
  );

  return {
    get app() {
      return app()!;
    },
    get stage() {
      return stage()!;
    },
  };
}

export function useStageContext() {
  const context = useContext(StageContext);
  if (!context) throw new Error("No stage context");
  return context;
}
