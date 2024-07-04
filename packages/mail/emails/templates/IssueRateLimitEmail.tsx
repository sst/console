// @ts-nocheck
import React from "react";
import {
  Img,
  Row,
  Html,
  Link,
  Body,
  Head,
  Button,
  Column,
  Preview,
  Section,
  Container,
} from "@jsx-email/all";
import { Hr, Text, Fonts, SplitString } from "../components";
import {
  unit,
  body,
  code,
  frame,
  heading,
  container,
  headingHr,
  footerLink,
  breadcrumb,
  compactText,
  buttonPrimary,
  breadcrumbSeparator,
  breadcrumbColonSeparator,
} from "../styles";

const LOCAL_ASSETS_URL = "/static";

interface IssueRateLimitEmailProps {
  app: string;
  stage: string;
  workspace: string;
  subject: string;
  message: string;
  assetsUrl: string;
  consoleUrl: string;
}
export const IssueRateLimitEmail = ({
  app = "console",
  workspace = "seed",
  stage = "production",
  subject = "Issues temporarily disabled",
  message = "Some of your functions hit a soft limit for the number of issues per hour. You can re-enable them or contact us to lift the limit.",
  assetsUrl = LOCAL_ASSETS_URL,
  consoleUrl = "https://console.sst.dev",
}: IssueRateLimitEmailProps) => {
  const url = `${consoleUrl}/${workspace}/${app}/${stage}/issues`;
  return (
    <Html lang="en">
      <Head>
        <title>{`SST — ${message}`}</title>
      </Head>
      <Fonts assetsUrl={assetsUrl} />
      <Preview>{message}</Preview>
      <Body style={body} id={Math.random().toString()}>
        <Container style={container}>
          <Section style={frame}>
            <Row>
              <Column>
                <a href={consoleUrl}>
                  <Img
                    height="32"
                    alt="SST Logo"
                    src={`${assetsUrl}/sst-logo.png`}
                  />
                </a>
              </Column>
              <Column align="right">
                <Button style={buttonPrimary} href={url}>
                  <span style={code}>Enable Issues</span>
                </Button>
              </Column>
            </Row>

            <Row style={headingHr}>
              <Column>
                <Hr />
              </Column>
            </Row>

            <Section>
              <Text style={{ ...compactText, ...breadcrumb }}>
                <span>{workspace}</span>
                <span style={{ ...code, ...breadcrumbColonSeparator }}>:</span>
                <span>{app}</span>
                <span style={{ ...code, ...breadcrumbSeparator }}>
                  &nbsp;/&nbsp;
                </span>
                <span>{stage}</span>
              </Text>
              <Text style={{ ...heading, ...compactText }}>
                <Link href={url}>
                  <SplitString text={subject} split={40} />
                </Link>
              </Text>
            </Section>
            <Section style={{ padding: `${unit}px 0 0 0` }}>
              <Text style={{ ...compactText }}>
                <SplitString text={message} split={63} />
              </Text>
            </Section>

            <Row style={headingHr}>
              <Column>
                <Hr />
              </Column>
            </Row>

            <Row>
              <Column>
                <Link href={consoleUrl} style={footerLink}>
                  Console
                </Link>
              </Column>
              <Column align="right">
                <Link
                  style={footerLink}
                  href={`${consoleUrl}/${workspace}/settings#alerts`}
                >
                  Settings
                </Link>
              </Column>
            </Row>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default IssueRateLimitEmail;
