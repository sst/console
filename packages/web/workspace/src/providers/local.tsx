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

interface State {
  app?: string;
  stage?: string;
}

const localContext = createContext<Accessor<State>>(() => ({}));

export function LocalProvider(props: ParentProps) {
  let reconnect: NodeJS.Timer;
  let ws: WebSocket;
  const [store, setStore] = createSignal<State>({});

  bus.on("log.cleared", (properties) => {
    ws.send(
      JSON.stringify({
        type: "log.cleared",
        properties,
      })
    );
  });

  bus.on("cli.dev", (properties) => {
    console.log("setting", properties);
    setStore(properties);
  });

  onMount(() => {
    function connect() {
      clearTimeout(reconnect);
      ws = new WebSocket("ws://localhost:13557/socket");
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
    ws.close();
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
