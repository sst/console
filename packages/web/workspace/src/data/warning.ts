import { define } from "$/providers/replicache";
import type { Info } from "@console/core/warning";

export const WarningStore = define<Info>({
  scan() {
    return ["warning"];
  },
  get(id: string) {
    return ["warning", id];
  },
});
