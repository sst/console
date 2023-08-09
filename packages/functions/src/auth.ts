import { AuthHandler, CodeAdapter, GithubAdapter } from "sst/node/future/auth";
import { Config } from "sst/node/config";
import { Account } from "@console/core/account";
import { useTransaction } from "@console/core/util/transaction";
import { provideActor } from "@console/core/actor";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import Botpoison from "@botpoison/node";

declare module "sst/node/future/auth" {
  export interface SessionTypes {
    account: {
      accountID: string;
      email: string;
    };
  }
}

const ses = new SESv2Client({});

export const handler = AuthHandler({
  providers: {
    github: GithubAdapter({
      mode: "oauth",
      scope: "read:user user:email",
      clientID: Config.GITHUB_CLIENT_ID,
      clientSecret: Config.GITHUB_CLIENT_SECRET,
    }),
    email: CodeAdapter({
      async onCodeRequest(code, claims) {
        provideActor({
          type: "public",
          properties: {},
        });
        console.log("sending email to", claims);
        console.log("Code", code);

        if (!process.env.IS_LOCAL) {
          const botpoison = new Botpoison({
            secretKey: Config.BOTPOISON_SECRET_KEY,
          });
          const { ok } = await botpoison.verify(claims.challenge);
          if (!ok)
            return {
              statusCode: 302,
              headers: {
                Location: process.env.AUTH_FRONTEND_URL + "/auth/email",
              },
            };
          console.log("challenge verified");
          const email = new SendEmailCommand({
            Destination: {
              ToAddresses: [claims.email],
            },
            FromEmailAddress: `SST <mail@${process.env.EMAIL_DOMAIN}>`,
            Content: {
              Simple: {
                Body: {
                  Html: {
                    Data: `Your pin code is <strong>${code}</strong>`,
                  },
                  Text: {
                    Data: `Your pin code is ${code}`,
                  },
                },
                Subject: {
                  Data: "SST Console Pin Code: " + code,
                },
              },
            },
          });
          await ses.send(email);
        }

        return {
          statusCode: 302,
          headers: {
            Location:
              process.env.AUTH_FRONTEND_URL +
              "/auth/code?" +
              new URLSearchParams({ email: claims.email }).toString(),
          },
        };
      },
      async onCodeInvalid() {
        return {
          statusCode: 302,
          headers: {
            Location:
              process.env.AUTH_FRONTEND_URL + "/auth/code?error=invalid_code",
          },
        };
      },
    }),
  },
  async clients() {
    return {
      solid: "",
    };
  },
  onSuccess: async (input, response) => {
    let email: string | undefined;

    if (input.provider === "email") {
      email = input.claims.email;
    }
    if (!email) throw new Error("No email found");

    let accountID = await Account.fromEmail(email).then((x) => x?.id);
    if (!accountID) {
      console.log("creating account for", email);
      await useTransaction(async () => {
        accountID = await Account.create({
          email: email!,
        });
      });
    }

    return response.session({
      type: "account",
      properties: {
        accountID: accountID!,
        email: email!,
      },
    });
  },
  onError: async () => ({
    statusCode: 401,
  }),
});
