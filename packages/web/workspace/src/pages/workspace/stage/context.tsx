import { createSubscription } from "$/providers/replicache";
import { ParentProps, createContext, useContext } from "solid-js";
import { useParams, useSearchParams } from "@solidjs/router";
import { StageStore } from "$/data/stage";
import { AppStore } from "$/data/app";
import { Resource } from "@console/core/app/resource";
import { DUMMY_RESOURCES } from "./resources-dummy";
import { ResourceStore } from "$/data/resource";

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

function createResourcesContext() {
  const ctx = useStageContext();
  const [query] = useSearchParams();
  const resources = createSubscription(
    () =>
      query.dummy
        ? async (): Promise<Resource.Info[]> => {
            return DUMMY_RESOURCES;
          }
        : ResourceStore.forStage(ctx.stage.id),
    [] as Resource.Info[]
  );

  return resources;
}

const ResourcesContext =
  createContext<ReturnType<typeof createResourcesContext>>();

export function ResourcesProvider(props: ParentProps) {
  const resources = createResourcesContext();
  return (
    <ResourcesContext.Provider value={resources}>
      {props.children}
    </ResourcesContext.Provider>
  );
}

export function useResourcesContext() {
  const context = useContext(ResourcesContext);
  if (!context) throw new Error("No resources context");
  return context;
}
