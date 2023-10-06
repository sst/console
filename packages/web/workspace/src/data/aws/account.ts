import type { Account } from "@console/core/aws/account";
import { Store } from "../store";

export const AccountStore = new Store()
  .type<Account.Info>()
  .scan("list", () => [`awsAccount`])
  .get((id: string) => [`awsAccount`, id])
  .build();
