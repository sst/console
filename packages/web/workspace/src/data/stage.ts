import type { Stage } from "@console/core/app/stage";
import { Store } from "./store";

export const StageStore = new Store()
  .type<Stage.Info>()
  .scan("list", () => ["stage"])
  .get((stageID: string) => ["issue", stageID])
  .build();
