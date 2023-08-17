import type { Usage } from "@console/core/billing";
import { define } from "$/providers/replicache";

export const UsageStore = define<Usage>({
  scan() {
    return ["usage"];
  },
  get(id: string) {
    return ["usage", id];
  },
});
