import { createSubscription } from "$/providers/replicache";
import {
  Accessor,
  ParentProps,
  Show,
  createContext,
  createEffect,
  createMemo,
  useContext,
} from "solid-js";
import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { StageStore } from "$/data/stage";
import { AppStore } from "$/data/app";
import { Resource } from "@console/core/app/resource";
import { DUMMY_RESOURCES } from "./resources-dummy";
import { ResourceStore } from "$/data/resource";
import { useCommandBar } from "../command-bar";
import { IconApi, IconFunction } from "$/ui/icons/custom";
import { useLocalContext } from "$/providers/local";

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
  const local = useLocalContext();

  return {
    get app() {
      return app()!;
    },
    get stage() {
      return stage()!;
    },
    get connected() {
      return local().app === app()?.name && local().stage === stage()?.name;
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

  const resources = createSubscription(() =>
    query.dummy
      ? async (): Promise<Resource.Info[]> => {
          return DUMMY_RESOURCES.hasOwnProperty(query.dummy)
            ? DUMMY_RESOURCES[query.dummy as keyof typeof DUMMY_RESOURCES]
            : DUMMY_RESOURCES.DEFAULT;
        }
      : ResourceStore.forStage(ctx.stage.id)
  );

  return resources;
}

const ResourcesContext = createContext<Accessor<Resource.Info[]>>();

function createFunctionsContext(resources: () => Resource.Info[] | undefined) {
  return createMemo(() => {
    const all = resources() || [];
    const result = new Map<string, Resource.Info[]>();

    function push(resource: Resource.Info, fn?: { node: string } | string) {
      if (!fn) return;
      const match = all.find(
        (r) =>
          r.type === "Function" &&
          ((typeof fn !== "string" && r.addr === fn.node) ||
            r.metadata.arn === fn)
      ) as Extract<Resource.Info, { type: "Function" }> | undefined;
      if (!match) return;

      let arr = result.get(match.id);
      if (!arr) result.set(match.id, (arr = []));
      arr.push(resource);
    }

    for (const resource of all) {
      switch (resource.type) {
        case "Function":
          if (!result.get(resource.id)) result.set(resource.id, []);
          break;
        case "Api":
          resource.metadata.routes.forEach((route) => push(resource, route.fn));
          break;
        case "WebSocketApi":
          resource.metadata.routes.forEach((route) => push(resource, route.fn));
          break;
        case "ApiGatewayV1Api":
          resource.metadata.routes.forEach((route) => push(resource, route.fn));
          break;
        case "Cron":
          push(resource, resource.metadata.job);
          break;
        case "Auth":
          break;
        case "Job":
          break;
        case "Table":
          resource.metadata.consumers.forEach((consumer) =>
            push(resource, consumer.fn)
          );
          break;
        case "RDS":
          break;
        case "Queue":
          push(resource, resource.metadata.consumer);
          break;
        case "Topic":
          resource.metadata.subscribers.forEach((item) => push(resource, item));
          break;
        case "Bucket":
          resource.metadata.notifications.forEach((item) =>
            push(resource, item)
          );
          break;
        case "Script":
          push(resource, resource.metadata.createfn);
          push(resource, resource.metadata.deletefn);
          push(resource, resource.metadata.updatefn);
          break;
        case "Cognito":
          resource.metadata.triggers.forEach((item) => push(resource, item.fn));
          break;
        case "AppSync":
          resource.metadata.dataSources.forEach((item) =>
            push(resource, item.fn)
          );
          break;
        case "EventBus":
          resource.metadata.rules.forEach((item) =>
            item.targets.forEach((t) => push(resource, t))
          );
          break;
        case "AstroSite":
          push(resource, resource.metadata.server);
          break;
        case "RemixSite":
          push(resource, resource.metadata.server);
          break;
        case "StaticSite":
          break;
        case "NextjsSite":
          push(resource, resource.metadata.server);
          break;
        case "SvelteKitSite":
          push(resource, resource.metadata.server);
          break;
        case "SolidStartSite":
          push(resource, resource.metadata.server);
          break;
        case "KinesisStream":
          resource.metadata.consumers.forEach((item) =>
            push(resource, item.fn)
          );
          break;
        case "SlsNextjsSite":
          break;
      }
    }

    return result;
  });
}

const FunctionsContext =
  createContext<ReturnType<typeof createFunctionsContext>>();

export function ResourcesProvider(props: ParentProps) {
  const resources = createResourcesContext();
  const functions = createFunctionsContext(resources);
  const params = useParams();
  const nav = useNavigate();
  const bar = useCommandBar();

  bar.register("resource", async (filter, global) => {
    if (global && !filter) return [];
    const splits = location.pathname.split("/");
    const appName = splits[2];
    const stageName = splits[3];
    if (!stageName || !appName) return [];
    return (resources() || []).flatMap((resource) => {
      if (resource.type === "Api") {
        return resource.metadata.routes.map((rt) => ({
          icon: IconApi,
          category: "API Routes",
          title: `Go to ${rt.route}`,
          run: (control) => {
            nav(
              `/${params.workspaceSlug}/${appName}/${stageName}/logs/${
                (resources() || []).find((r) => r.addr === rt.fn?.node)?.id
              }`
            );
            control.hide();
          },
        }));
      }

      if (resource.type === "Function") {
        return [
          {
            icon: IconFunction,
            category: "Functions",
            title: `Go to ${resource.metadata.handler}`,
            run: (control) => {
              nav(
                `/${params.workspaceSlug}/${appName}/${stageName}/logs/${resource.id}`
              );
              control.hide();
            },
          },
        ];
      }
      return [];
    });
  });

  return (
    <Show when={resources()}>
      {(val) => (
        <ResourcesContext.Provider value={val}>
          <FunctionsContext.Provider value={functions}>
            {props.children}
          </FunctionsContext.Provider>
        </ResourcesContext.Provider>
      )}
    </Show>
  );
}

export function useResourcesContext() {
  const context = useContext(ResourcesContext);
  if (!context) throw new Error("No resources context");
  return context;
}

export function useFunctionsContext() {
  const context = useContext(FunctionsContext);
  if (!context) throw new Error("No resources context");
  return context;
}
