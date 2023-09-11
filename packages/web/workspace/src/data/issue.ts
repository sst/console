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

export const IssueCountStore = define<Issue.Count>({
  scan() {
    return ["issueCount"];
  },
  get(id: string) {
    return ["issueCount", id];
  },
});
