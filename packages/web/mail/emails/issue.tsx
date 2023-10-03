import React from "react";
import {
  Hr,
  Img,
  Row,
  Html,
  Link,
  Body,
  Head,
  Font,
  Button,
  Column,
  Preview,
  Heading,
  Section,
  Container,
  Text,
} from "@react-email/components";

const LOCAL_ASSETS_URL = "/static";

const blackColor = "#1A1A2E";
const dividerColor = "#D5D5D9";
const backgroundColor = "#F0F0F1";

const body = {
  background: backgroundColor,
};

const container = {};

const frame = {
  padding: "32px",
  border: `1px solid ${dividerColor}`,
  background: "#FFF",
  borderRadius: "6px",
  boxShadow: `0 1px 2px rgba(0,0,0,0.03),
              0 2px 4px rgba(0,0,0,0.03),
              0 2px 6px rgba(0,0,0,0.03)`,
};

const code = {
  fontFamily: "IBM Plex Mono, mono-space",
};

const buttonPrimary = {
  color: "#FFF",
  borderRadius: "4px",
  padding: "12px 20px",
  background: "#395C6B",
  fontSize: "13px",
};

function Fonts({ assetsUrl }: { assetsUrl: string }) {
  return (
    <>
      <Font
        fontFamily="IBM Plex Mono"
        fallbackFontFamily="mono-space"
        webFont={{
          url: `${assetsUrl}/ibm-plex-mono-latin-400.woff2`,
          format: "woff2",
        }}
        fontWeight="400"
        fontStyle="normal"
      />
      <Font
        fontFamily="IBM Plex Mono"
        fallbackFontFamily="mono-space"
        webFont={{
          url: `${assetsUrl}/ibm-plex-mono-latin-700.woff2`,
          format: "woff2",
        }}
        fontWeight="700"
        fontStyle="normal"
      />
      <Font
        fontFamily="Rubik"
        fallbackFontFamily="Helvetica, Arial, sans-serif"
        webFont={{
          url: `${assetsUrl}/rubik-latin.woff2`,
          format: "woff2",
        }}
        fontWeight="400 500 600 700"
        fontStyle="normal"
      />
    </>
  );
}

interface IssueEmailProps {
  url: string;
  name: string;
  message: string;
  assetsUrl: string;
}
const IssueEmail = ({
  name = "NoSuchBucket",
  assetsUrl = LOCAL_ASSETS_URL,
  message = "The specified bucket does not exist",
  url = "https://console.sst.dev/sst/console/production/issues/pioksmvi6x2sa9zdljvn8ytw",
}: IssueEmailProps) => {
  return (
    <Html lang="en">
      <Head>
        <title>{`SST — ${name}: ${message}`}</title>
      </Head>
      <Fonts assetsUrl={assetsUrl} />
      <Preview>
        SST — {name}: {message}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={frame}>
            <Section>
              <Column>
                <Img
                  width="40"
                  height="31"
                  alt="SST Logo"
                  src={`${assetsUrl}/sst-logo.png`}
                />
              </Column>
              <Column align="right">
                <Button pX={16} pY={11} style={buttonPrimary} href={url}>
                  View Issue
                </Button>
              </Column>
            </Section>
            <Text style={code}>
              <b style={code}>{name}</b>: {message}
            </Text>
            <Button
              pX={20}
              pY={12}
              href="https://example.com"
              style={{ background: "#000", color: "#fff" }}
            >
              <b style={{ fontWeight: 600 }}>Click</b> me
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default IssueEmail;
