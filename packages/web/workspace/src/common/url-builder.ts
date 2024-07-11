export function githubRepo(owner: string, repo: string) {
  return `https://github.com/${owner}/${repo}`;
}

export function githubCommit(repo: string, commit: string) {
  return `${repo}/commit/${commit}`;
}

export function githubBranch(repo: string, branch: string) {
  return `${repo}/tree/${branch}`;
}

export function githubPr(repo: string, pr: number) {
  return `${repo}/pull/${pr}`;
}

export function githubTag(repo: string, tag: string) {
  return `${repo}/tree/${tag}`;
}
