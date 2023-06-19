import { LogStore } from "$/data/log";
import { LogPollerStore } from "$/data/log-poller";
import { ResourceStore } from "$/data/resource";
import { createSubscription, useReplicache } from "$/providers/replicache";
import { Stack } from "$/ui/layout";
import { LogPoller } from "@console/core/log-poller";
import { useParams } from "@solidjs/router";
import { For, Show, createEffect, createMemo } from "solid-js";

export function Logs() {
  const params = useParams();
  const resource = createSubscription(() =>
    ResourceStore.fromID(params.resourceID)
  );
  const logGroup = createMemo(() => {
    const r = resource();
    if (!r) return "";
    const logGroup = (() => {
      if (r.type === "Function") {
        return r.metadata.arn
          .replace("function:", "log-group:/aws/lambda/")
          .replace("arn:aws:lambda", "arn:aws:logs");
      }
      return "";
    })();

    return logGroup;
  });
  const rep = useReplicache();
  const poller = createSubscription(() =>
    LogPollerStore.fromLogGroup(logGroup())
  );

  createEffect(() => {
    console.log(poller());
    if (!logGroup()) return;
    if (poller()) return;
    if (!resource()) return;
    rep().mutate.log_poller_subscribe({
      logGroup: logGroup(),
      stageID: resource()!.stageID,
    });
  });

  const logs = createMemo(() =>
    (logGroup() ? Object.entries(LogStore[logGroup()!] || {}) : []).sort(
      (a, b) => (b[1]?.start || 0) - (a[1]?.start || 0)
    )
  );

  createEffect(() => console.log(logs()));

  return (
    <>
      <div>Logs for {resource()?.cfnID}</div>
      <Stack space="8">
        <For each={logs().slice(0, 200)}>
          {([request, data]) => (
            <Stack space="2">
              <div>Request: {request}</div>
              <For each={data.logs.sort((a, b) => b.timestamp - a.timestamp)}>
                {(log) => (
                  <div>
                    {new Date(log.timestamp).toLocaleString()}: {log.message}
                  </div>
                )}
              </For>
            </Stack>
          )}
        </For>
      </Stack>
    </>
  );
}
