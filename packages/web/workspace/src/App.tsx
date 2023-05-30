import "@fontsource/rubik/latin.css";
import "@fontsource/ibm-plex-mono/latin.css";

import { Component, For, createSignal, createEffect, Show } from "solid-js";
import { Link, Navigate, Route, Router, Routes } from "@solidjs/router";
import { AuthProvider, useAuth } from "./data/auth";
import { createSubscription } from "./data/replicache";
import { UserStore } from "./data/user";
import { WorkspaceStore } from "./data/workspace";
import { Workspace } from "./pages/workspace";
import { Connect } from "./pages/connect";
import { Debug } from "./pages/debug";
import { Design } from "./pages/design";
import { styled } from "@macaron-css/solid";
import { globalStyle } from "@macaron-css/core";
import { theme, darkClass, lightClass } from "./ui/theme";
import { account, setAccount } from "./data/storage";

console.log(import.meta.env.VITE_API_URL);

const initializeTheme = () => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const Root = styled("div", {
  base: {
    inset: 0,
    position: "fixed",
    lineHeight: 1,
    fontFamily: theme.fonts.body,
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

globalStyle("a", {
  textDecoration: "none",
  color: theme.color.link.primary.base,
});

globalStyle("a:hover", {
  color: theme.color.link.primary.hover,
});

globalStyle("*:focus", {
  border: 0,
  outline: 0,
});

globalStyle("*", {
  cursor: "default",
});

globalStyle("input", {
  cursor: "text",
});

export const App: Component = () => {
  const [theme, setTheme] = createSignal<string>(initializeTheme());

  createEffect(() => {
    const darkMode = window.matchMedia("(prefers-color-scheme: dark)");

    const setColorScheme = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? "dark" : "light");
    };

    darkMode.addEventListener("change", setColorScheme);

    return () => {
      darkMode.removeEventListener("change", setColorScheme);
    };
  });

  return (
    <Root class={theme() === "light" ? lightClass : darkClass} id="styled">
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="debug" component={Debug} />
            <Route path="design" component={Design} />
            <Route path="connect" component={Connect} />
            <Route path=":workspaceID/*" component={Workspace} />
            <Route
              path="*"
              component={() => {
                const auth = useAuth();
                let existing = account();
                if (!existing || !auth[existing]) {
                  existing = Object.keys(auth)[0];
                  setAccount(existing);
                }
                const users = createSubscription(
                  UserStore.list,
                  [],
                  () => auth[existing].replicache
                );

                return (
                  <Show when={users().length > 0}>
                    <Navigate href={`/${users()[0].workspaceID}`} />
                  </Show>
                );
              }}
            />
          </Routes>
        </Router>
      </AuthProvider>
    </Root>
  );
};

function Header() {
  const auth = useAuth();

  return (
    <For each={Object.values(auth)}>
      {(entry) => {
        const users = createSubscription(
          UserStore.list,
          [],
          () => entry.replicache
        );
        return (
          <ol>
            <li>{users()[0]?.email}</li>
            <ol>
              <For each={users()}>
                {(user) => {
                  const workspace = createSubscription(
                    () => WorkspaceStore.fromID(user.workspaceID),
                    undefined,
                    () => entry.replicache
                  );
                  return (
                    <li>
                      <Link
                        href={`/${entry.token.accountID}/${workspace()?.id}`}
                      >
                        {" "}
                        Workspace: {workspace()?.slug}
                      </Link>
                    </li>
                  );
                }}
              </For>
            </ol>
          </ol>
        );
      }}
    </For>
  );
}

// App
// -> look for any login tokens
// -> redirect to default
// -> if none found, redirect to login
// Workspace
// -> make sure the login token exists + works
// -> otherwise redirect to login
