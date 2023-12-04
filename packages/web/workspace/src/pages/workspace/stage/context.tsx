import { useReplicache } from "$/providers/replicache";
import {
  Accessor,
  ParentProps,
  Show,
  createContext,
  createMemo,
  useContext,
} from "solid-js";
import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { StageStore } from "$/data/stage";
import { AppStore } from "$/data/app";
import { Resource } from "@console/core/app/resource";
import { useCommandBar } from "../command-bar";
import { IconApi, IconFunction, IconNextjsSite } from "$/ui/icons/custom";
import { useLocalContext } from "$/providers/local";
import { ResourceIcon } from "$/common/resource-icon";
import { createInitializedContext } from "$/common/context";
import { IssueStore } from "$/data/issue";
import { ResourceStore } from "$/data/resource";
import { UsageStore } from "$/data/usage";
import { sumBy } from "remeda";

export const StageContext =
  createContext<ReturnType<typeof createStageContext>>();

export function createStageContext() {
  const params = useParams();
  const rep = useReplicache();
  const app = AppStore.all.watch(
    rep,
    () => [],
    (items) => items.find((app) => app.name === params.appName)
  );
  const stage = StageStore.list.watch(
    rep,
    () => [],
    (items) =>
      items.find(
        (stage) => stage.appID === app()?.id && stage.name === params.stageName
      )
  );
  const local = useLocalContext();
  const usage = UsageStore.forStage.watch(
    rep,
    () => [stage()?.id || "unknown"],
    (items) => sumBy(items, (item) => item.invocations)
  );

  return {
    get app() {
      return app()!;
    },
    get stage() {
      return stage()!;
    },
    get connected() {
      return (
        local().app === app()?.name &&
        local().stage === stage()?.name &&
        (!local().region || stage()?.region === local().region)
      );
    },
    get isFree() {
      return usage() < 1_000_000;
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

  const rep = useReplicache();
  const resources = ResourceStore.forStage.watch(rep, () => [ctx.stage.id]);

  return resources;
}

const ResourcesContext = createContext<Accessor<Resource.Info[]>>();

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
    return [...functions().entries()].flatMap(([fnId, refs]) => {
      const fn = resources().find((r) => r.id === fnId) as Extract<
        Resource.Info,
        { type: "Function" }
      >;
      if (!fn) return [];
      const run = (control: any) => {
        nav(
          `/${params.workspaceSlug}/${appName}/${stageName}/resources/logs/${fn.id}`
        );
        control.hide();
      };
      if (!refs.length)
        return [
          {
            icon: IconFunction,
            category: `Function`,
            title: `${fn.metadata.handler}`,
            run,
          },
        ];
      return refs.flatMap((resource) => {
        switch (resource.type) {
          case "NextjsSite":
            return (
              resource.metadata.routes?.data?.map((item) => ({
                icon: IconNextjsSite,
                category: "NextJS Routes",
                title: `${item.route}`,
                run(control) {
                  nav(
                    `/${
                      params.workspaceSlug
                    }/${appName}/${stageName}/resources/logs/${
                      fn.id
                    }?logGroup=${
                      resource.metadata.routes!.logGroupPrefix +
                      item.logGroupPath
                    }`
                  );
                  control.hide();
                },
              })) || []
            );
          case "Api":
            return [
              {
                icon: IconApi,
                category: "API Routes",
                title: `${
                  resource.metadata.routes.find((r) => r.fn?.node === fn.addr)
                    ?.route
                }`,
                run,
              },
            ];
          default:
            return {
              icon: ResourceIcon[resource.type] || IconFunction,
              category: `${resource.type}`,
              title: `${fn.metadata.handler}`,
              run,
            };
        }
      });
    });
  });

  return (
    <Show when={resources.ready && resources()}>
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

export const MINIMUM_VERSION = "2.19.2";
function parseVersion(input: string) {
  return input
    .split(".")
    .map((item) => parseInt(item))
    .reduce((acc, val, i) => acc + val * Math.pow(1000, 2 - i), 0);
}
export function useOutdated() {
  const resources = useResourcesContext();
  const stacks = createMemo(() =>
    resources().filter((r) => r.type === "Stack")
  );
  return createMemo(() =>
    stacks().filter(
      (r) =>
        r.type === "Stack" &&
        r.enrichment.version &&
        parseVersion(r.enrichment.version) < parseVersion(MINIMUM_VERSION) &&
        !r.enrichment.version?.startsWith("0.0.0")
    )
  );
}

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

export function useFunctionsContext() {
  const context = useContext(FunctionsContext);
  if (!context) throw new Error("No resources context");
  return context;
}

export const { use: useIssuesContext, provider: IssuesProvider } =
  createInitializedContext("Issues", () => {
    const rep = useReplicache();
    const ctx = useStageContext();
    const issues = IssueStore.forStage.watch(rep, () => [ctx.stage.id]);
    return issues;
  });
