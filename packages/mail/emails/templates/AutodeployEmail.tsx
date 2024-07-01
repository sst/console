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
  SECONDARY_COLOR,
} from "../styles";

const LOCAL_ASSETS_URL = "/static";

const contextInfo = {
  color: SECONDARY_COLOR,
};

interface AutodeployEmailProps {
  app: string;
  stage?: string;
  workspace: string;
  subject: string;
  message: string;
  commit: string;
  commitUrl: string;
  assetsUrl: string;
  consoleUrl: string;
  runUrl: string;
}
export const AutodeployEmail = ({
  app = "console",
  workspace = "seed",
  //stage = "production",
  stage = undefined,
  //subject = "Deploy failed",
  subject = "Deployed",
  //message = "Failed to initialize runner",
  message = "Deployed successfully to production",
  commit = "7c14080",
  commitUrl = "https://github.com/fwang/ion-playground/commit/7c14080b5675d2b2e02aeb154a73c098ae764776",
  assetsUrl = LOCAL_ASSETS_URL,
  consoleUrl = "https://console.sst.dev",
  runUrl = "https://console.sst.dev/seed/console/autodeploy/pioksmvi6x2sa9zdljvn8ytw",
}: AutodeployEmailProps) => {
  return (
    <Html lang="en">
      <Head>
        <title>{`SST — ${subject}`}</title>
      </Head>
      <Fonts assetsUrl={assetsUrl} />
      <Preview>{subject}</Preview>
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
                <Button style={buttonPrimary} href={runUrl}>
                  <span style={code}>View Deploy</span>
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
                {stage && (
                  <>
                    <span style={{ ...code, ...breadcrumbSeparator }}>
                      &nbsp;/&nbsp;
                    </span>
                    <span>{stage}</span>
                  </>
                )}
              </Text>
              <Text style={{ ...heading, ...compactText }}>
                <Link style={code} href={runUrl}>
                  <SplitString text={subject} split={40} />
                </Link>
              </Text>
            </Section>
            <Section style={{ padding: `${unit}px 0 0 0` }}>
              <Text style={{ ...compactText, ...code }}>
                <SplitString text={message} split={63} />
              </Text>
            </Section>
            <Section style={{ padding: `${unit}px 0 0 0` }}>
              <Text style={{ ...compactText, ...contextInfo }}>
                Using commit:{" "}
                <Link href={commitUrl} style={code}>
                  {commit}
                </Link>
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

export default AutodeployEmail;
