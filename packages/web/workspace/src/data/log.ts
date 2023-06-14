import { bus } from "$/providers/bus";
import { createStore, produce, reconcile } from "solid-js/store";

export const [LogStore, setLogStore] = createStore<Record<string, any[]>>();

bus.on("log", (event) => {
  setLogStore(
    produce((state) => {
      let arr = state[event.logGroup];
      if (!arr) {
        state[event.logGroup] = [event.event];
        return;
      }
      arr.push(event.event);
      console.log(state);
    })
  );
});
