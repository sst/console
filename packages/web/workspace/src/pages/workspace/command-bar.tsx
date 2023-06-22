import {
  For,
  JSX,
  ParentProps,
  batch,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  useContext,
} from "solid-js";
import {
  IconApi,
  IconApp,
  IconStage,
  IconSubRight,
  IconEventBus,
  IconConstruct,
} from "$/ui/icons/custom";
import { IconBuildingOffice } from "$/ui/icons";
import { useAuth } from "$/providers/auth";
import { UserStore } from "../../data/user";
import { WorkspaceStore } from "../../data/workspace";
import { styled } from "@macaron-css/solid";
import { useReplicache } from "$/providers/replicache";
import { AppStore } from "../../data/app";
import { theme } from "$/ui/theme";
import { filter, groupBy, pipe } from "remeda";
import { globalStyle } from "@macaron-css/core";
import { createShortcut } from "@solid-primitives/keyboard";
import { useNavigate, useParams } from "@solidjs/router";
import { StageStore } from "../../data/stage";
import { ResourceStore } from "../../data/resource";
import { Portal } from "solid-js/web";
import { createEventListener } from "@solid-primitives/event-listener";
import { createMutationObserver } from "@solid-primitives/mutation-observer";
import { setAccount } from "$/data/storage";

interface Action {
  icon: (props: any) => JSX.Element;
  title: string;
  category?: string;
  hotkeys?: string[];
  run: (control: Control) => void | Promise<void>;
}

type ActionProvider = (filter: string) => Promise<Action[]>;

export const WorkspaceProvider: ActionProvider = async () => {
  const workspaces = await Promise.all(
    Object.values(useAuth()).map(async (account) => {
      const workspaces = await account.replicache.query(async (tx) => {
        const users = await UserStore.list()(tx);
        return Promise.all(
          users.map(async (user) => {
            const workspace = await WorkspaceStore.fromID(user.workspaceID)(tx);
            return { account: account, workspace };
          })
        );
      });
      return workspaces;
    })
  ).then((x) => x.flat());
  const splits = location.pathname.split("/");
  return workspaces
    .filter((w) => w.workspace?.slug !== splits[1])
    .map((w) => ({
      title: `Switch to ${w.workspace?.slug} workspace`,
      category: "Workspace",
      icon: IconBuildingOffice,
      run: (control) => {
        const nav = useNavigate();
        setAccount(w.account.token.accountID);
        nav(`/${w.workspace.slug}`);
        control.hide();
      },
    }));
};

export const AppProvider: ActionProvider = async () => {
  const rep = useReplicache()();
  const apps = await rep.query(AppStore.list());
  return apps.map((app) => ({
    icon: IconApp,
    category: "App",
    title: `Switch to "${app.name}" app`,
    run: async (control) => {
      const nav = useNavigate();
      const params = useParams();
      const rep = useReplicache();
      const stages = await rep().query(StageStore.forApp(app.id));
      nav(`/${params.workspaceSlug}/${app.name}/${stages[0].name}`);
      control.hide();
    },
  }));
};

export const StageProvider: ActionProvider = async () => {
  const splits = location.pathname.split("/");
  const appName = splits[2];
  if (!appName) return [];
  const rep = useReplicache()();
  const app = await rep.query(AppStore.fromName(appName));
  const stages = await rep.query(StageStore.forApp(app!.id));
  return stages
    .filter((stage) => stage.name !== splits[3])
    .map((stage) => ({
      icon: IconStage,
      category: "Stage",
      title: `Switch to "${stage.name}" stage`,
      run: (control) => {
        const params = useParams();
        const nav = useNavigate();
        nav(`/${params.workspaceSlug}/${app!.name}/${stage.name}`);
        control.hide();
      },
    }));
};

export const ResourceProvider: ActionProvider = async (filter) => {
  if (!filter) return [];
  const splits = location.pathname.split("/");
  const appName = splits[2];
  const stageName = splits[3];
  if (!stageName || !appName) return [];
  const rep = useReplicache()();
  const app = await rep.query(AppStore.fromName(appName));
  if (!app) return [];
  const stage = await rep.query(StageStore.fromName(app!.id, stageName));
  if (!stage) return [];
  const resources = await rep.query(ResourceStore.forStage(stage.id));
  return resources.flatMap((resource) => {
    if (resource.type === "Api") {
      return resource.metadata.routes.map((rt) => ({
        icon: IconApi,
        category: "API Routes",
        title: `Go to ${rt.route}`,
        run: (control) => {
          const params = useParams();
          useNavigate()(
            `/${params.workspaceSlug}/${appName}/${stageName}/logs/${
              resources.find((r) => r.addr === rt.fn?.node)?.id
            }`
          );
          control.hide();
        },
      }));
    }

    if (resource.type === "EventBus") {
      return resource.metadata.rules.flatMap((rule) =>
        rule.targets.filter(Boolean).map((t) => ({
          icon: IconEventBus,
          category: "EventBus Subscriptions",
          title: `Go to ${
            // @ts-expect-error
            resources.find((r) => r.addr === t!.node)?.metadata["handler"]
          }`,
          run: (control) => {
            const params = useParams();
            const id = resources.find((r) => r.addr === t?.node)?.id;
            useNavigate()(
              `/${params.workspaceSlug}/${appName}/${stageName}/logs/${id}`
            );
            control.hide();
          },
        }))
      );
    }
    return [];
  });
};

export const AccountProvider: ActionProvider = async () => {
  return [
    {
      icon: IconSubRight,
      category: "Account",
      title: "Switch workspaces...",
      run: (control) => {
        control.show(WorkspaceProvider);
      },
    },
    {
      icon: IconSubRight,
      category: "Account",
      title: "Switch apps...",
      run: (control) => {
        control.show(AppProvider);
      },
    },
  ];
};

const DEFAULT_PROVIDERS = [
  ResourceProvider,
  StageProvider,
  AppProvider,
  WorkspaceProvider,
  AccountProvider,
];

const Root = styled("div", {
  base: {
    position: "fixed",
    backgroundColor: theme.color.background.overlay,
    opacity: 0,
    inset: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "start",
    pointerEvents: "none",
    transition: "200ms opacity",
    paddingTop: "10vh",
  },
  variants: {
    show: {
      true: {
        opacity: 1,
        pointerEvents: "all",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      },
    },
  },
});

const Modal = styled("div", {
  base: {
    width: 640,
    borderRadius: 10,
    flexShrink: 0,
    boxShadow: theme.color.shadow.drop.long,
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    background: theme.color.background.modal,
    transform: "scale(0.95)",
    transition: "200ms all",
  },
});

globalStyle(`${Root.selector({ show: true })} ${Modal}`, {
  transform: "initial",
});

const Filter = styled("div", {
  base: {
    padding: `${theme.space[4]} ${theme.space[5]}`,
    display: "flex",
  },
});

const FilterInput = styled("input", {
  base: {
    flexGrow: 1,
    border: 0,
    background: "transparent",
  },
});

const Results = styled("div", {
  base: {
    borderTop: `1px solid ${theme.color.divider.base}`,
    maxHeight: 320,
    padding: `${theme.space[2]} ${theme.space[2]}`,
    overflowY: "auto",
    selectors: {
      "&::-webkit-scrollbar": {
        display: "none",
      },
      "&:empty": {
        display: "none",
      },
    },
  },
});

const Category = styled("div", {
  base: {
    display: "flex",
    padding: `${theme.space[2]} ${theme.space[3]}`,
    fontFamily: theme.fonts.heading,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: "0.75rem",
    alignItems: "center",
    fontWeight: theme.textBoldWeight,
    color: theme.color.text.dimmed,
  },
});

const ActionRow = styled("div", {
  base: {
    padding: `${theme.space[3]} ${theme.space[3]}`,
    display: "flex",
    alignItems: "center",
    borderRadius: 4,
    fontSize: "0.8125rem",
    gap: theme.space[2],
    transitionDelay: "0s",
    transitionDuration: "0.2s",
    transitionProperty: "background-color",
    transitionTimingFunction: "ease-out",
  },
});

globalStyle(`${ActionRow}.active`, {
  background: theme.color.background.hover,
});

const ActionRowIcon = styled("div", {
  base: {
    width: 16,
    height: 16,
  },
});

globalStyle(`${ActionRowIcon} svg`, {
  color: theme.color.text.secondary,
  opacity: theme.iconOpacity,
  transitionDelay: "0s",
  transitionDuration: "0.2s",
  transitionProperty: "color",
  transitionTimingFunction: "ease-out",
});

globalStyle(`${ActionRow}.active ${ActionRowIcon} svg`, {
  color: theme.color.text.primary.surface,
});

const ActionRowTitle = styled("div", {
  base: {
    color: theme.color.text.primary.surface,
  },
});

function createControl() {
  const [providers, setProviders] = createSignal<ActionProvider[]>([]);
  const [visible, setVisible] = createSignal(false);
  const [actions, setActions] = createSignal<Action[]>([]);
  const [input, setInput] = createSignal("");
  const [root, setRoot] = createSignal<HTMLElement>();

  function show(...providers: ActionProvider[]) {
    batch(() => {
      setProviders(providers);
      setVisible(true);
      setInput("");
    });
    control.input().focus();
    control.setActive(control.actions()[0]);
  }

  function hide() {
    setVisible(false);
  }

  createShortcut(["Control", "K"], () => {
    show();
  });

  createShortcut(["Meta", "K"], () => {
    show();
  });

  createEffect(async () => {
    const p = providers().length ? providers() : DEFAULT_PROVIDERS;
    const actions = await Promise.all(
      p.map(async (provider) => {
        const actions = await provider(input());
        return actions;
      })
    ).then((x) => x.flat());
    setActions(actions);
  });

  const groups = createMemo(() => {
    return pipe(
      actions() || [],
      filter((action) =>
        action.title.toLowerCase().includes(input().toLowerCase())
      ),
      groupBy((a) => a.category)
    );
  });

  createMutationObserver(
    () => root()?.querySelector(`[data-element="results"]`)!,
    { childList: true },
    () => control.reset()
  );

  const control = {
    get root() {
      const r = root();
      if (!r) throw new Error("Root not set");
      return r;
    },
    input() {
      return control.root.querySelector("input") as HTMLInputElement;
    },
    actions() {
      return [...control.root.querySelectorAll("[data-element='action']")];
    },
    reset() {
      control.setActive(control.actions()[0]);
    },
    active() {
      return control.root.querySelector(
        "[data-element='action'].active"
      ) as HTMLElement;
    },
    setActive(el: Element) {
      if (!el) return;
      const current = control.active();
      if (current) current.classList.remove("active");
      el.classList.add("active");
      el.scrollIntoView({
        block: "end",
      });
    },
    move(direction: -1 | 1) {
      const current = control.active();
      const all = control.actions();
      if (!current) {
        control.setActive(all[0]);
        return;
      }
      const index = all.indexOf(current);
      const next = all[index + direction];
      control.setActive(next ?? all[direction == 1 ? 0 : all.length - 1]);
    },
    next() {
      return control.move(1);
    },
    back() {
      return control.move(-1);
    },
  };

  createShortcut(["Enter"], () => {
    const current = control.active();
    if (current) current.click();
  });

  createEventListener(window, "keydown", (e) => {
    if (!visible()) return;
    if (e.key === "ArrowDown") {
      control.next();
      e.preventDefault();
    }

    if (e.key === "ArrowUp") {
      control.back();
      e.preventDefault();
    }

    if (e.key === "Escape") {
      hide();
    }
  });

  createEventListener(root, "click", (e) => {
    const el = e.target as HTMLElement;
    const closest = el.closest<HTMLElement>("[data-element='action']");
  });

  return {
    bind: setRoot,
    get input() {
      return input();
    },
    setInput,
    setActive: control.setActive,
    get groups() {
      return groups();
    },
    get visible() {
      return visible();
    },
    show,
    hide,
  };
}

type Control = ReturnType<typeof createControl>;

const CommandbarContext = createContext<Control>();

export function CommandBar(props: ParentProps) {
  const control = createControl();

  return (
    <CommandbarContext.Provider value={control}>
      {props.children}
      <Portal mount={document.getElementById("styled")!}>
        <Root show={control.visible} ref={control.bind}>
          <Modal>
            <Filter>
              <FilterInput
                value={control.input}
                onInput={(e) => control.setInput(e.target.value)}
                autofocus
                placeholder="Type to search"
              />
            </Filter>
            <Results data-element="results">
              <For each={Object.entries(control.groups)}>
                {([category, actions]) => (
                  <>
                    <Category>{category}</Category>
                    <For each={actions}>
                      {(action) => (
                        <ActionRow
                          data-element="action"
                          onClick={() => {
                            action.run(control);
                          }}
                        >
                          <ActionRowIcon>
                            <action.icon />
                          </ActionRowIcon>
                          <ActionRowTitle>{action.title}</ActionRowTitle>
                        </ActionRow>
                      )}
                    </For>
                  </>
                )}
              </For>
            </Results>
          </Modal>
        </Root>
      </Portal>
    </CommandbarContext.Provider>
  );
}

export function useCommandBar() {
  const ctx = useContext(CommandbarContext);
  if (!ctx) throw new Error("No commandbar context");
  return ctx;
}
