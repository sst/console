import { define } from "$/providers/replicache";
import type { App } from "@console/core/app";

export const AppStore = define<App.Info>({
  scan() {
    return ["app"];
  },
  get(id: string) {
    return ["app", id];
  },
});
