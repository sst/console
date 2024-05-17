import { Show } from "solid-js";
import { AppContext, createAppContext, useAppContext } from "./context";
import { Header, HeaderProvider, useHeaderContext } from "../header";
import { Route, Routes } from "@solidjs/router";
import { NotFound } from "$/pages/not-found";
import { Stage } from "../stage";
import { Settings } from "./settings";
import { Overview } from "./overview";

export function App() {
  const appContext = createAppContext();

  return (
    <Show when={appContext.app}>
      <AppContext.Provider value={appContext}>
        <HeaderProvider>
          <Routes>
            <Route path=":stageName/*" component={Stage} />
            <Route path="settings" component={Settings} />
            <Route path="" component={Overview} />
            <Route path="*" element={<NotFound header />} />
          </Routes>
        </HeaderProvider>
      </AppContext.Provider>
    </Show>
  );
}
