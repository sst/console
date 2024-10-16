import {
  Issuer,
  OauthAdapter,
  AuthHandler,
  CodeAdapter,
} from "sst/node/future/auth";
import { Config } from "sst/node/config";
import { Account } from "@console/core/account";
import { Slack } from "@console/core/slack";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import Botpoison from "@botpoison/node";
import { sessions } from "./sessions";
import { withActor } from "@console/core/actor";
import { Response, useCookie, useFormValue, useResponse } from "sst/node/api";
import { User } from "@console/core/user";
import { z } from "zod";

const ses = new SESv2Client({});

export const handler = AuthHandler({
  sessions,
  providers: {
    slack: OauthAdapter({
      issuer: new Issuer({
        authorization_endpoint: "https://slack.com/oauth/v2/authorize",
        issuer: "https://slack.com",
        token_endpoint: "https://slack.com/api/oauth.v2.access",
      }),
      scope: "chat:write team:read chat:write.public",
      clientID: Config.SLACK_CLIENT_ID,
      clientSecret: Config.SLACK_CLIENT_SECRET,
    }),
    email: CodeAdapter({
      async onCodeRequest(code, claims) {
        return withActor(
          {
            type: "public",
            properties: {},
          },
          async () => {
            console.log("sending email to", claims);
            console.log("code", code);
            const email = z.string().email().safeParse(claims.email);
            if (!email.success) {
              return {
                statusCode: 302,
                headers: {
                  Location: process.env.AUTH_FRONTEND_URL + "/auth/email",
                },
              };
            }

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
              const cmd = new SendEmailCommand({
                Destination: {
                  ToAddresses: [email.data],
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
              await ses.send(cmd);
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
          }
        );
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
  callbacks: {
    connect: {
      async start() {
        const workspaceID = useFormValue("workspaceID");
        if (!workspaceID)
          throw new Response({
            statusCode: 401,
            body: "workspaceID required",
          });
        useResponse().cookie({
          key: "workspaceID",
          value: workspaceID,
          maxAge: 60 * 15,
        });
      },
      async success(session, result) {
        if (session.type !== "account")
          throw new Response({
            statusCode: 401,
            body: "Unauthorized",
          });
        const workspaceID = useCookie("workspaceID")!;
        const user = await User.findUser(workspaceID, session.properties.email);
        if (!user)
          throw new Response({
            statusCode: 401,
            body: "Unauthorized",
          });

        await withActor(
          {
            type: "user",
            properties: {
              workspaceID,
              userID: user.id,
            },
          },
          async () => {
            if (result.provider === "slack") {
              await Slack.connect(result.tokenset.access_token!);
            }
          }
        );

        return {
          statusCode: 200,
          headers: {
            "content-type": "text/html",
          },
          body: `
          <html>
            <script>
              if (window.opener) {
                window.opener.postMessage("slack.success", "*")
                window.close()
              }
            </script>
          `,
        };
      },
    },
    auth: {
      async allowClient(clientID, redirect) {
        return true;
      },
      async success(input, response) {
        let email: string | undefined;

        if (input.provider === "email") {
          if (
            input.claims.impersonate &&
            input.claims.email.split("@")[1] !== "sst.dev"
          )
            return response.http({
              statusCode: 401,
              body: "Unauthorized",
            });
          email = input.claims.impersonate || input.claims.email;
        }
        if (!email) throw new Error("No email found");

        let accountID = await Account.fromEmail(email).then((x) => x?.id);
        if (!accountID) {
          console.log("creating account for", email);
          accountID = await Account.create({
            email: email!,
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
    },
  },
});
