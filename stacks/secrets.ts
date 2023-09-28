import { Config, StackContext } from "sst/constructs";

export function Secrets(ctx: StackContext) {
  return {
    database: Config.Secret.create(
      ctx.stack,
      "PLANETSCALE_USERNAME",
      "PLANETSCALE_PASSWORD",
    ),
    github: Config.Secret.create(
      ctx.stack,
      "GITHUB_CLIENT_ID",
      "GITHUB_CLIENT_SECRET",
    ),
    botpoison: new Config.Secret(ctx.stack, "BOTPOISON_SECRET_KEY"),
    cloudflare: new Config.Secret(ctx.stack, "CLOUDFLARE_TOKEN"),
    slack: [
      new Config.Secret(ctx.stack, "SLACK_CLIENT_ID"),
      new Config.Secret(ctx.stack, "SLACK_CLIENT_SECRET"),
    ],
    stripe: [
      new Config.Secret(ctx.stack, "STRIPE_SECRET_KEY"),
      new Config.Secret(ctx.stack, "STRIPE_WEBHOOK_SIGNING_SECRET"),
      new Config.Parameter(ctx.stack, "STRIPE_PRICE_ID", {
        value:
          ctx.stack.stage === "production"
            ? "price_1NlZmAEAHP8a0ogpglxmSac1"
            : "price_1NgB4oEAHP8a0ogpxqUXHKee",
      }),
    ],
  };
}
