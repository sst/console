import {
  Accessor,
  ParentProps,
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  useContext,
} from "solid-js";
import { bus } from "./bus";
import { createStore, produce } from "solid-js/store";
import { useDummy } from "./dummy";

interface State {
  app?: string;
  stage?: string;
}

const localContext = createContext<Accessor<State>>(() => ({}));

export function LocalProvider(props: ParentProps) {
  let reconnect: NodeJS.Timer;
  let ws: WebSocket;
  const dummy = useDummy();
  const [store, setStore] = createSignal<State>(
    dummy()
      ? {
          app: "dummy",
          stage: "dummy",
        }
      : {},
  );

  bus.on("log.cleared", (properties) => {
    ws.send(
      JSON.stringify({
        type: "log.cleared",
        properties,
      }),
    );
  });

  bus.on("cli.dev", (properties) => {
    console.log("setting", properties);
    setStore(properties);
  });

  let ssl = true;
  onMount(() => {
    if (dummy()) return;
    function connect() {
      console.log("trying to connect to local ssl:", ssl);
      ssl = !ssl;
      clearTimeout(reconnect);
      ws = new WebSocket(`ws${ssl ? "s" : ""}://localhost:13557/socket`);
      ws.onmessage = (e) => {
        const parsed = JSON.parse(e.data);
        bus.emit(parsed.type, parsed.properties);
      };
      ws.onclose = () => {
        reconnect = setTimeout(connect, 3000);
      };
      ws.onerror = () => {
        reconnect = setTimeout(connect, 3000);
      };
    }
    connect();
  });

  onCleanup(() => {
    if (ws) ws.close();
    if (reconnect) clearTimeout(reconnect);
  });

  return (
    <localContext.Provider value={store}>
      {props.children}
    </localContext.Provider>
  );
}

export function useLocalContext() {
  const ctx = useContext(localContext);
  if (!ctx) throw new Error("No local context found");
  return ctx;
}
