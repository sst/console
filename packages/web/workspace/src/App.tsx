import "./providers/freshpaint";
import "@fontsource/rubik/latin.css";
import "@fontsource/ibm-plex-mono/latin.css";
import { styled } from "@macaron-css/solid";
import { darkClass, lightClass, theme } from "./ui/theme";
import { globalStyle, macaron$ } from "@macaron-css/core";
import { dropAllDatabases } from "replicache";
import {
  Match,
  Switch,
  onCleanup,
  Component,
  createMemo,
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
import { WorkspaceStore } from "./data/workspace";
import { UserStore } from "./data/user";
import { IconLogout, IconAddCircle, IconWorkspace } from "./ui/icons/custom";
import { LocalProvider } from "./providers/local";
import { useStorage } from "./providers/account";
import { DummyConfigProvider, DummyProvider } from "./providers/dummy";
import { InvocationProvider } from "./providers/invocation";
import { FlagsProvider } from "./providers/flags";
import { createGet } from "./data/store";

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

globalStyle("pre", {
  margin: 0,
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

globalStyle("body", {
  cursor: "default",
});

globalStyle("*", {
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
              <DummyProvider>
                <AuthProvider>
                  <DummyConfigProvider>
                    <FlagsProvider>
                      <RealtimeProvider />
                      <LocalProvider>
                        <InvocationProvider>
                          <CommandBar>
                            <GlobalCommands />
                            <Routes>
                              <Route path="debug" component={Debug} />
                              <Route path="design" component={Design} />
                              <Route path="connect" component={Connect} />
                              <Route
                                path="workspace"
                                component={WorkspaceCreate}
                              />
                              <Route
                                path=":workspaceSlug/*"
                                component={Workspace}
                              />
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
                                  const workspaces = WorkspaceStore.list.watch(
                                    () => auth[existing!].replicache,
                                    () => []
                                  );

                                  const init = createGet<boolean>(
                                    () => "/init",
                                    () => auth[existing!].replicache
                                  );

                                  return (
                                    <Switch>
                                      <Match
                                        when={
                                          workspaces() &&
                                          workspaces()!.length > 0
                                        }
                                      >
                                        <Navigate
                                          href={`/${
                                            (
                                              workspaces()!.find(
                                                (w) =>
                                                  w.id ===
                                                  storage.value.workspace
                                              ) || workspaces()![0]
                                            ).slug
                                          }`}
                                        />
                                      </Match>
                                      <Match
                                        when={
                                          init.ready &&
                                          init() &&
                                          workspaces() &&
                                          workspaces()!.length === 0
                                        }
                                      >
                                        <Navigate href={`/workspace`} />
                                      </Match>
                                      <Match when={true}>
                                        {/* <Splash /> */}
                                      </Match>
                                    </Switch>
                                  );
                                }}
                              />
                            </Routes>
                          </CommandBar>
                        </InvocationProvider>
                      </LocalProvider>
                    </FlagsProvider>
                  </DummyConfigProvider>
                </AuthProvider>
              </DummyProvider>
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
  const storage = useStorage();
  const selfEmail = createMemo(() => auth[storage.value.account].session.email);

  bar.register("workspace-switcher", async () => {
    const workspaces = await Promise.all(
      Object.values(auth).map(async (account) => {
        const workspaces = await account.replicache.query(async (tx) => {
          const users = await UserStore.list(tx);
          return Promise.all(
            users.map(async (user) => {
              const workspace = await WorkspaceStore.get(tx, user.workspaceID);
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
          icon: IconWorkspace,
          run: (control: any) => {
            storage.set("account", w.account.session.accountID);
            nav(`/${w.workspace.slug}`);
            control.hide();
          },
        })),
      {
        icon: IconAddCircle,
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
        icon: IconLogout,
        run: async () => {
          await dropAllDatabases();
          localStorage.clear();
          location.href = "/";
        },
      },
    ];
  });
  return undefined;
}
