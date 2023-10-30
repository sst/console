import { Issue } from "@console/core/issue";

export async function handler() {
  await Issue.cleanup();
}
