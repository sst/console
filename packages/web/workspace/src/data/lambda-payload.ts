import type { LambdaPayload } from "@console/core/lambda";
import { Store } from "./store";

export const LambdaPayloadStore = new Store()
  .type<LambdaPayload>()
  .scan("list", () => ["lambdaPayload"])
  .get((id: string) => [`lambdaPayload`, id])
  .build();
