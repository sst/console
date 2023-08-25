import { createSessionBuilder } from "sst/node/future/auth";

export const sessions = createSessionBuilder<{
  account: {
    accountID: string;
    email: string;
  };
}>();
