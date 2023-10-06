import type { Search } from "@console/core/log";
import { Store } from "./store";

export const LogSearchStore = new Store()
  .type<Search.Info>()
  .scan("list", () => [`log_search`])
  .get((id: string) => [`log_search`, id])
  .build();
