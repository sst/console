import type { Resource } from "@console/core/app/resource";
import { Store } from "./store";

export const ResourceStore = new Store()
  .type<Resource.Info>()
  .scan("forStage", (stageID: string) => ["resource", stageID])
  .get((id: string) => ["resource", id])
  .build();
