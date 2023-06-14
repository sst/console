import { LogStore } from "$/data/log";
import { ResourceStore } from "$/data/resource";
import { createSubscription, useReplicache } from "$/providers/replicache";
import { useParams } from "@solidjs/router";
import { For, Show, createEffect, createMemo } from "solid-js";

export function Logs() {
  const params = useParams();
  const resource = createSubscription(() =>
    ResourceStore.fromID(params.resourceID)
  );
  const rep = useReplicache();

  const logGroup = createMemo(() => {
    const r = resource();
    if (!r) return;
    const logGroup = (() => {
      if (r.type === "Function") {
        return r.metadata.arn
          .replace("function:", "log-group:/aws/lambda/")
          .replace("arn:aws:lambda", "arn:aws:logs");
      }
    })();

    if (logGroup) {
      rep().mutate.log_poller_subscribe({
        logGroup,
        stageID: r.stageID,
      });
    }

    return logGroup;
  });

  const logs = createMemo(() => (logGroup() ? LogStore[logGroup()!] : []));

  return (
    <>
      <div>Logs for {resource()?.cfnID}</div>
      <For each={logs()}>{(event) => <pre>{event.message}</pre>}</For>
    </>
  );
}
