import "./providers/freshpaint";
import "@fontsource/rubik/latin.css";
import "@fontsource/ibm-plex-mono/latin.css";
import { styled } from "@macaron-css/solid";
import { darkClass, lightClass, theme } from "./ui/theme";
import { globalStyle, macaron$ } from "@macaron-css/core";
import {
  Match,
  Switch,
  onCleanup,
  Component,
  createMemo,
  createEffect,
  createSignal,
} from "solid-js";
import { Navigate, Route, Router, Routes, useNavigate } from "@solidjs/router";
import { Auth, Code } from "./pages/auth";
import { AuthProvider, useAuth } from "./providers/auth";
import { RealtimeProvider } from "./providers/realtime";
import { CommandBar, useCommandBar } from "./pages/workspace/command-bar";
import { Debug } from "./pages/debug";
import { Design } from "./pages/design";
import { Connect } from "./pages/connect";
import { Workspace } from "./pages/workspace";
import { WorkspaceCreate } from "./pages/workspace-create";
import { createSubscription } from "./providers/replicache";
import { WorkspaceStore } from "./data/workspace";
import { UserStore } from "./data/user";
import {
  IconPlus,
  IconArrowLeftOnRectangle,
  IconBuildingOffice,
} from "./ui/icons";
import { LocalProvider } from "./providers/local";
import { useStorage } from "./providers/account";
import { Fullscreen, Splash } from "./ui";

const Root = styled("div", {
  base: {
    inset: 0,
    position: "fixed",
    lineHeight: 1,
    fontFamily: theme.font.family.body,
    fontSynthesis: "none",
    textRendering: "geometricPrecision",
    backgroundColor: theme.color.background.base,
    overflowY: "auto",
  },
});

globalStyle("html", {
  fontSize: 16,
  fontWeight: 400,
});

globalStyle("h1, h2, h3, h4, h5, h6, p", {
  margin: 0,
});

globalStyle("b", {
  fontWeight: 500,
});

globalStyle("a", {
  textDecoration: "none",
  color: theme.color.link.primary.base,
  transition: `color ${theme.colorFadeDuration} ease-out`,
});

globalStyle("a:hover", {
  color: theme.color.link.primary.hover,
});

globalStyle(`a[href^="http"]`, {
  cursor: "pointer",
});

globalStyle("*:focus", {
  border: 0,
  outline: 0,
});

macaron$(() =>
  ["::placeholder", ":-ms-input-placeholder"].forEach((selector) =>
    globalStyle(selector, {
      opacity: 1,
      color: theme.color.text.dimmed.base,
    })
  )
);

globalStyle("*", {
  cursor: "default",
  boxSizing: "border-box",
});

globalStyle("input", {
  cursor: "text",
});

macaron$(() =>
  [
    "input::-webkit-datetime-edit-day-field:focus",
    "input::-webkit-datetime-edit-hour-field:focus",
    "input::-webkit-datetime-edit-year-field:focus",
    "input::-webkit-datetime-edit-month-field:focus",
    "input::-webkit-datetime-edit-minute-field:focus",
    "input::-webkit-datetime-edit-second-field:focus",
    "input::-webkit-datetime-edit-meridiem-field:focus",
    "input::-webkit-datetime-edit-millisecond-field:focus",
  ].forEach((selector) =>
    globalStyle(selector, {
      // Mimic WebKit text selection color
      backgroundColor: "#B4D5FE",
    })
  )
);

globalStyle("ul, ol", {
  margin: 0,
  padding: 0,
});

export const App: Component = () => {
  const [theme, setTheme] = createSignal<string>(
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  const darkMode = window.matchMedia("(prefers-color-scheme: dark)");
  const setColorScheme = (e: MediaQueryListEvent) => {
    setTheme(e.matches ? "dark" : "light");
  };
  darkMode.addEventListener("change", setColorScheme);
  onCleanup(() => {
    darkMode.removeEventListener("change", setColorScheme);
  });
  const storage = useStorage();

  return (
    <Root class={theme() === "light" ? lightClass : darkClass} id="styled">
      <Router>
        <Routes>
          <Route path="auth/*" component={Auth} />
          <Route
            path="*"
            element={
              <AuthProvider>
                <RealtimeProvider />
                <LocalProvider>
                  <CommandBar>
                    <GlobalCommands />
                    <Routes>
                      <Route path="debug" component={Debug} />
                      <Route path="design" component={Design} />
                      <Route path="connect" component={Connect} />
                      <Route path="workspace" component={WorkspaceCreate} />
                      <Route path=":workspaceSlug/*" component={Workspace} />
                      <Route path="/auth/code" component={Code} />
                      <Route
                        path="*"
                        component={() => {
                          const auth = useAuth();
                          let existing = storage.value.account;
                          if (!existing || !auth[existing]) {
                            existing = Object.keys(auth)[0];
                            storage.set("account", existing);
                          }
                          const workspaces = createSubscription(
                            WorkspaceStore.list,
                            null,
                            () => auth[existing!].replicache
                          );

                          const init = createSubscription(
                            () => (tx) => {
                              return tx.get("/init");
                            },
                            false,
                            () => auth[existing!].replicache
                          );

                          createEffect(() =>
                            console.log("workspaces", workspaces())
                          );

                          return (
                            <Switch>
                              <Match
                                when={workspaces() && workspaces()!.length > 0}
                              >
                                <Navigate
                                  href={`/${
                                    (
                                      workspaces()!.find(
                                        (w) => w.id === storage.value.workspace
                                      ) || workspaces()![0]
                                    ).slug
                                  }`}
                                />
                              </Match>
                              <Match
                                when={
                                  init() &&
                                  workspaces() &&
                                  workspaces()!.length === 0
                                }
                              >
                                <Navigate href={`/workspace`} />
                              </Match>
                              <Match when={true}>{/* <Splash /> */}</Match>
                            </Switch>
                          );
                        }}
                      />
                    </Routes>
                  </CommandBar>
                </LocalProvider>
              </AuthProvider>
            }
          />
        </Routes>
      </Router>
    </Root>
  );
};

function GlobalCommands() {
  const bar = useCommandBar();
  const auth = useAuth();
  const nav = useNavigate();
  const account = useStorage();
  const selfEmail = createMemo(() => auth[account.value.account].token.email);

  bar.register("workspace-switcher", async () => {
    const workspaces = await Promise.all(
      Object.values(auth).map(async (account) => {
        const workspaces = await account.replicache.query(async (tx) => {
          const users = await UserStore.list()(tx);
          return Promise.all(
            users.map(async (user) => {
              const workspace = await WorkspaceStore.fromID(user.workspaceID)(
                tx
              );
              return { account: account, workspace };
            })
          );
        });
        return workspaces;
      })
    ).then((x) => x.flat());
    const splits = location.pathname.split("/");
    return [
      ...workspaces
        .filter((w) => w.workspace?.slug !== splits[1])
        .map((w) => ({
          title: `Switch to ${w.workspace?.slug} workspace`,
          category: "Workspace",
          icon: IconBuildingOffice,
          run: (control: any) => {
            account.set("account", w.account.token.accountID);
            nav(`/${w.workspace.slug}`);
            control.hide();
          },
        })),
      {
        icon: IconPlus,
        category: "Workspace",
        title: "Create new workspace",
        run: (control) => {
          nav("/workspace");
          control.hide();
        },
      },
    ];
  });

  bar.register("account", async () => {
    return [
      {
        category: "Account",
        title: `Logout from ${selfEmail()}`,
        icon: IconArrowLeftOnRectangle,
        run: async (control: any) => {
          const dbs = await window.indexedDB.databases();
          dbs.forEach((db) => {
            window.indexedDB.deleteDatabase(db.name!);
          });
          localStorage.clear();
          location.href = "/";
        },
      },
    ];
  });
  return undefined;
}
