import { Issue } from "@console/core/issue";
import { Log } from "@console/core/log";

export async function handler() {
  await Issue.cleanup();
  await Log.Search.cleanup();
}
