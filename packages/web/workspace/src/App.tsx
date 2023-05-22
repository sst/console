import "@fontsource/rubik/latin.css";
import "@fontsource/ibm-plex-mono/latin.css";

import { Component, For, createSignal, createEffect } from "solid-js";
import { Link, Route, Router, Routes } from "@solidjs/router";
import { AuthProvider, useAuth } from "./data/auth";
import { createSubscription } from "./data/replicache";
import { UserStore } from "./data/user";
import { WorkspaceStore } from "./data/workspace";
import { Workspace } from "./pages/workspace";
import { Connect } from "./pages/connect";
import { Debug } from "./pages/debug";
import { styled } from "@macaron-css/solid";
import { globalStyle } from "@macaron-css/core";
import { theme, darkClass, lightClass } from "./ui/theme";
import { CommandBar } from "./pages/workspace/command-bar";

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
  color: theme.color.link.primary,
});

globalStyle("a:hover", {
  textDecoration: "underline",
  textUnderlineOffset: "3px",
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
    <Root class={theme() === "light" ? lightClass : darkClass}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="" component={Header} />
            <Route path="debug" component={Debug} />
            <Route path="connect" component={Connect} />
            <Route path=":accountID/:workspaceID/*" component={Workspace} />
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
