import { define } from "$/providers/replicache";
import type { Issue } from "@console/core/issue";

export const IssueStore = define<Issue.Info>({
  scan() {
    return ["issue/"];
  },
  get(id: string) {
    return ["issue", id];
  },
});
