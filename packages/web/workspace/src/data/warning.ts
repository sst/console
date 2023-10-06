import type { Info } from "@console/core/warning";
import { Store } from "./store";

export const WarningStore = new Store()
  .type<Info>()
  .scan("forStage", (stageID: string) => ["warning", stageID])
  .scan("forType", (stageID: string, type: string) => [
    "warning",
    stageID,
    type,
  ])
  .get((stageID: string, type: string, id: string) => [
    "warning",
    stageID,
    type,
    id,
  ])
  .build();
