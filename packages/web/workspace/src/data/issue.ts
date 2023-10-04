import { define } from "$/providers/replicache";
import type { Issue } from "@console/core/issue";

export const IssueStore = define<Issue.Info>({
  scan() {
    return ["issue/"];
  },
  get(input: { stageID: string; issueID: string }) {
    return ["issue", input.stageID, input.issueID];
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
