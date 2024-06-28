import { ReadTransaction } from "replicache";
import type { Stage } from "@console/core/app/stage";
import { Store } from "./store";

export const StageStore = new Store()
  .type<Stage.Info>()
  .scan("list", () => ["stage"])
  .get((stageID: string) => ["stage", stageID])
  .build();

export function ActiveStages() {
  return async (tx: ReadTransaction) => {
    return (await StageStore.list(tx)).filter(stage => !stage.timeDeleted);
  };
}

export function ActiveStagesForApp(appID: string) {
  return async (tx: ReadTransaction) => {
    return (await StageStore.list(tx))
      .filter(stage => stage.appID === appID && !stage.timeDeleted);
  };
}
