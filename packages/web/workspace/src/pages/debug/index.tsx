import { createWatch } from "$/providers/replicache";
import type { Resource } from "@console/core/app/resource";
import { For, createEffect, createMemo } from "solid-js";

export function Debug() {
  const test = createWatch<Resource.Info>(() => "/resource/");
  const filtered = createMemo(() =>
    Object.values(test).filter((x) => x.type === "Stack")
  );

  return (
    <For each={filtered()}>
      {(item) => <div>{JSON.stringify(item.enrichment)}</div>}
    </For>
  );
}
