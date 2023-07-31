import { Config, StackContext } from "sst/constructs";

export function Secrets(ctx: StackContext) {
  return {
    database: Config.Secret.create(
      ctx.stack,
      "PLANETSCALE_USERNAME",
      "PLANETSCALE_PASSWORD"
    ),
    github: Config.Secret.create(
      ctx.stack,
      "GITHUB_CLIENT_ID",
      "GITHUB_CLIENT_SECRET"
    ),
    botpoison: new Config.Secret(ctx.stack, "BOTPOISON_SECRET_KEY"),
  };
}
