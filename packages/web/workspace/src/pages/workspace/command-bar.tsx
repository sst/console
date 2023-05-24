import {
  For,
  batch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import { useAuth } from "../../data/auth";
import { UserStore } from "../../data/user";
import { WorkspaceStore } from "../../data/workspace";
import { styled } from "@macaron-css/solid";
import { useReplicache } from "../../data/replicache";
import { AppStore } from "../../data/app";
import { theme } from "src/ui/theme";
import { filter, groupBy, pipe } from "remeda";
import { globalStyle } from "@macaron-css/core";
import { createShortcut } from "@solid-primitives/keyboard";
import { useNavigate, useParams } from "@solidjs/router";
import { StageStore } from "../../data/stage";
import { ResourceStore } from "../../data/resource";

interface Action {
  icon: string;
  title: string;
  category?: string;
  hotkeys?: string[];
  run: (control: Control) => void | Promise<void>;
}

type ActionProvider = (filter: string) => Promise<Action[]>;

const WorkspaceProvider: ActionProvider = async () => {
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
  return workspaces.map((w) => ({
    title: "Switch to workspace " + w.workspace.slug,
    category: "Workspace",
    icon: "",
    run: (control) => {
      const nav = useNavigate();
      nav(`/${w.account.token.accountID}/${w.workspace.id}`);
      control.hide();
    },
  }));
};

const AppProvider: ActionProvider = async () => {
  const rep = useReplicache()();
  const apps = await rep.query(AppStore.list());
  return apps.map((app) => ({
    icon: "",
    category: "App",
    title: `Switch to "${app.name}" app`,
    run: (control) => {
      const nav = useNavigate();
      const params = useParams();
      nav(`/${params.accountID}/${params.workspaceID}/apps/${app.id}`);
      control.hide();
    },
  }));
};

const StageProvider: ActionProvider = async () => {
  const appID = location.pathname.split("/")[4];
  if (!appID) return [];
  const rep = useReplicache()();
  const stages = await rep.query(StageStore.forApp(appID));
  return stages.map((stage) => ({
    icon: "",
    category: "Stage",
    title: `Switch to "${stage.name}" stage`,
    run: (control) => {
      const nav = useNavigate();
      const params = useParams();
      nav(
        `/${params.accountID}/${params.workspaceID}/apps/${stage.appID}/stages/${stage.id}`
      );
      control.hide();
    },
  }));
};

const ResourceProvider: ActionProvider = async (filter) => {
  if (!filter) return [];
  const stageId = location.pathname.split("/")[6];
  console.log(stageId);
  if (!stageId) return [];
  const rep = useReplicache()();
  const resources = await rep.query(ResourceStore.forStage(stageId));
  return resources.flatMap((resource) => {
    if (resource.type === "Api") {
      return resource.metadata.routes.map((rt) => ({
        icon: "",
        category: "API Route",
        title: `Go to ${rt.route}`,
        run: () => {},
      }));
    }

    if (resource.type === "EventBus") {
      return resource.metadata.rules.map((rule) => ({
        icon: "",
        category: "Event Bus Subscriptions",
        title: `Go to ${rule.key}`,
        run: () => {},
      }));
    }
    return [];
  });
};

const AccountProvider: ActionProvider = async () => {
  return [
    {
      icon: "",
      category: "Account",
      title: "Switch workspaces...",
      run: (control) => {
        control.show(WorkspaceProvider);
      },
    },
    {
      icon: "",
      category: "Account",
      title: "Switch apps...",
      run: (control) => {
        control.show(AppProvider);
      },
    },
  ];
};

const providers = [
  ResourceProvider,
  StageProvider,
  AppProvider,
  WorkspaceProvider,
  AccountProvider,
];

const Root = styled("div", {
  base: {
    position: "fixed",
    background: "rgba(0, 0, 0, 0.2)",
    opacity: 0,
    inset: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
    transition: "200ms opacity",
  },
  variants: {
    show: {
      true: {
        opacity: 1,
        pointerEvents: "all",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
      },
    },
  },
});

const Modal = styled("div", {
  base: {
    width: 640,
    borderRadius: 8,
    flexShrink: 0,
    boxShadow: `rgb(0 0 0 / 50%) 0px 16px 70px`,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    background: "rgba(255, 255, 255, 0.8)",
    transform: "scale(0.95)",
    transition: "200ms all",
  },
});

globalStyle(`${Root.selector({ show: true })} ${Modal}`, {
  transform: "initial",
});

const Filter = styled("div", {
  base: {
    padding: `${theme.space[4]}`,
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
    padding: theme.space[2],
    overflowY: "auto",
    selectors: {
      "&::-webkit-scrollbar": {
        display: "none",
      },
    },
  },
});

const Category = styled("div", {
  base: {
    display: "flex",
    padding: theme.space[2],
    fontSize: 12,
    alignItems: "center",
    fontWeight: 500,
    color: theme.color.text.primary.surface,
  },
});

const ActionRow = styled("div", {
  base: {
    height: 40,
    padding: `0 ${theme.space[3]}`,
    display: "flex",
    alignItems: "center",
    borderRadius: 4,
    fontSize: 12,
    gap: theme.space[4],
  },
});

globalStyle(`${ActionRow}.active`, {
  background: theme.color.background.hover,
});

const ActionRowIcon = styled("div", {
  base: {
    width: 16,
    height: 16,
    background: "black",
    borderRadius: 4,
  },
});

const ActionRowTitle = styled("div", {
  base: {
    color: theme.color.text.primary.surface,
  },
});

function createControl() {
  const [provider, setProvider] = createSignal<ActionProvider>();
  const [visible, setVisible] = createSignal(false);
  const [actions, setActions] = createSignal<Action[]>([]);
  const [input, setInput] = createSignal("");

  function show(provider?: ActionProvider) {
    batch(() => {
      setProvider(() => provider);
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

  createEffect(async () => {
    const p = provider();
    if (p) {
      setActions(await p(input()));
      return;
    }
    const actions = await Promise.all(
      providers.map(async (provider) => {
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

  createEffect(() => console.log("actions", actions()));

  const observer = new MutationObserver(() => {
    control.reset();
  });

  onCleanup(() => observer.disconnect());

  const control = {
    root: undefined as unknown as HTMLElement,
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

  return {
    bind(root: HTMLElement) {
      control.root = root;
      const input = root.querySelector("input")!;
      input.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") {
          control.next();
          e.preventDefault();
        }
        if (e.key === "ArrowUp") {
          control.back();
          e.preventDefault();
        }
      });

      input.addEventListener("blur", (e) => {
        hide();
      });

      observer.observe(root.querySelector(`[data-element="results"]`)!, {
        childList: true,
      });
    },
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

export function CommandBar() {
  const control = createControl();

  return (
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
                      onClick={() => {
                        action.run(control);
                      }}
                      onMouseEnter={(e) => control.setActive(e.currentTarget)}
                      data-element="action"
                    >
                      <ActionRowIcon />
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
  );
}
