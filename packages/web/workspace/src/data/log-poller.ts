import type { LogPoller } from "@console/core/log/poller";
import { Store } from "./store";

export const LogPollerStore = new Store()
  .type<LogPoller.Info>()
  .scan("list", () => ["log_poller"])
  .get((id: string) => [`log_poller`, id])
  .build();
