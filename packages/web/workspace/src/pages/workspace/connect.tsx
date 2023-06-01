import { AppStore } from "$/data/app";
import { createSubscription, useReplicache } from "$/data/replicache";
import { StageStore } from "$/data/stage";
import { Navigate, useSearchParams } from "@solidjs/router";
import { Match, Show, Switch, createMemo } from "solid-js";

export function Connect() {
  const rep = useReplicache();
  const [query] = useSearchParams();
  rep().mutate.connect({
    aws_account_id: query.aws_account_id!,
    app: query.app!,
    stage: query.stage!,
    region: query.region!,
  });

  const app = createSubscription(() => AppStore.fromName(query.app!));
  const stages = createSubscription(
    () => StageStore.forApp(app()?.id || "unknown"),
    []
  );
  const stage = createMemo(() => stages().find((s) => s.name === query.stage));

  return (
    <Show
      when={stage()}
      fallback={`Connecting ${query.app}/${query.stage} to aws...`}
    >
      <Navigate href={`../${app()?.id}/${stage()?.id}`} />
    </Show>
  );
}
