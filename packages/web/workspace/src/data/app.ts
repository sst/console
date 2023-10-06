import type { App } from "@console/core/app";
import { Store } from "./store";

export const AppStore = new Store()
  .type<App.Info>()
  .scan("all", () => ["app"])
  .get((id: string) => ["app", id])
  .build();
