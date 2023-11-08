// @ts-nocheck
import React from "react";
import {
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
  Section,
  Container,
  Hr as JEHr,
  Text as JEText,
  HrProps as JEHrProps,
  TextProps as JETextProps,
} from "@jsx-email/all";

const LOCAL_ASSETS_URL = "/static";

const unit = 16;

const GREY_COLOR = [
  "#1A1A2E", //0
  "#2F2F41", //1
  "#444454", //2
  "#585867", //3
  "#6D6D7A", //4
  "#82828D", //5
  "#9797A0", //6
  "#ACACB3", //7
  "#C1C1C6", //8
  "#D5D5D9", //9
  "#EAEAEC", //10
  "#FFFFFF", //11
];

const BLUE_COLOR = "#395C6B";
const TEXT_COLOR = GREY_COLOR[0];
const SECONDARY_COLOR = GREY_COLOR[5];
const DIMMED_COLOR = GREY_COLOR[7];
const DIVIDER_COLOR = GREY_COLOR[10];
const BACKGROUND_COLOR = "#F0F0F1";
const SURFACE_COLOR = DIVIDER_COLOR;
const SURFACE_DIVIDER_COLOR = GREY_COLOR[9];

const body = {
  background: BACKGROUND_COLOR,
};

const container = {
  minWidth: "600px",
};

const frame = {
  padding: `${unit * 1.5}px`,
  border: `1px solid ${SURFACE_DIVIDER_COLOR}`,
  background: "#FFF",
  borderRadius: "6px",
  boxShadow: `0 1px 2px rgba(0,0,0,0.03),
              0 2px 4px rgba(0,0,0,0.03),
              0 2px 6px rgba(0,0,0,0.03)`,
};

const textColor = {
  color: TEXT_COLOR,
};

const code = {
  fontFamily: "IBM Plex Mono, monospace",
};

const headingHr = {
  margin: `${unit}px 0`,
};

const buttonPrimary = {
  ...code,
  padding: "12px 18px",
  color: "#FFF",
  borderRadius: "4px",
  background: BLUE_COLOR,
  fontSize: "12px",
  fontWeight: 500,
};

const compactText = {
  margin: "0 0 2px",
};

const issueBreadcrumb = {
  fontSize: "14px",
  color: SECONDARY_COLOR,
};

const issueWorkspaceSeparator = {
  padding: " 0 4px",
  color: DIMMED_COLOR,
};

const issueBreadcrumbSeparator = {
  color: DIVIDER_COLOR,
};

const issueHeading = {
  ...code,
  fontSize: "22px",
  fontWeight: 600,
};

const sectionLabel = {
  ...code,
  ...compactText,
  letterSpacing: "0.5px",
  fontSize: "13px",
  fontWeight: 500,
  color: DIMMED_COLOR,
};

const stacktraceContainer = {
  padding: `${unit * 0.75}px ${unit}px`,
  borderRadius: "5px",
  background: SURFACE_COLOR,
};

const stacktraceFrame = {
  ...code,
  fontSize: "13px",
  color: DIMMED_COLOR,
};
const stacktraceFrameFileImportant = {
  ...stacktraceFrame,
  color: TEXT_COLOR,
  fontWeight: 500,
};
const stacktraceFramePositionImportant = {
  ...stacktraceFrame,
  color: SECONDARY_COLOR,
  fontWeight: 500,
};
const stacktraceFrameContext = {
  ...code,
  margin: "4px 0",
  fontSize: "12px",
  color: DIMMED_COLOR,
};
const stacktraceFrameContextImportant = {
  ...stacktraceFrameContext,
  color: TEXT_COLOR,
  fontWeight: 500,
};

const footerLink = {
  fontSize: "14px",
};

function countLeadingSpaces(str: string) {
  let count = 0;
  for (let char of str) {
    if (char === " ") {
      count++;
    } else if (char === "\t") {
      count += 2;
    } else {
      break;
    }
  }
  return count;
}

function Text(props: JETextProps) {
  return <JEText {...props} style={{ ...textColor, ...props.style }} />;
}

function Hr(props: JEHrProps) {
  return (
    <JEHr
      {...props}
      style={{ borderTop: `1px solid ${DIVIDER_COLOR}`, ...props.style }}
    />
  );
}

function SurfaceHr(props: JEHrProps) {
  return (
    <JEHr
      {...props}
      style={{
        borderTop: `1px solid ${SURFACE_DIVIDER_COLOR}`,
        ...props.style,
      }}
    />
  );
}

function Fonts({ assetsUrl }: { assetsUrl: string }) {
  return (
    <>
      <Font
        fontFamily="IBM Plex Mono"
        fallbackFontFamily="monospace"
        webFont={{
          url: `${assetsUrl}/ibm-plex-mono-latin-400.woff2`,
          format: "woff2",
        }}
        fontWeight="400"
        fontStyle="normal"
      />
      <Font
        fontFamily="IBM Plex Mono"
        fallbackFontFamily="monospace"
        webFont={{
          url: `${assetsUrl}/ibm-plex-mono-latin-500.woff2`,
          format: "woff2",
        }}
        fontWeight="500"
        fontStyle="normal"
      />
      <Font
        fontFamily="IBM Plex Mono"
        fallbackFontFamily="monospace"
        webFont={{
          url: `${assetsUrl}/ibm-plex-mono-latin-600.woff2`,
          format: "woff2",
        }}
        fontWeight="600"
        fontStyle="normal"
      />
      <Font
        fontFamily="IBM Plex Mono"
        fallbackFontFamily="monospace"
        webFont={{
          url: `${assetsUrl}/ibm-plex-mono-latin-700.woff2`,
          format: "woff2",
        }}
        fontWeight="700"
        fontStyle="normal"
      />
      <Font
        fontFamily="Rubik"
        fallbackFontFamily={["Helvetica", "Arial", "sans-serif"]}
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

function SplitString({ text, split }: { text: string; split: number }) {
  const segments: JSX.Element[] = [];
  for (let i = 0; i < text.length; i += split) {
    segments.push(
      <React.Fragment key={`${i}text`}>
        {text.slice(i, i + split)}
      </React.Fragment>
    );
    if (i + split < text.length) {
      segments.push(<wbr key={`${i}wbr`} />);
    }
  }
  return <>{segments}</>;
}

// @ts-expect-error
function FormattedCode({ text, split = 60, indent = 0 }) {
  const renderProcessedString = () => {
    let elements: JSX.Element[] = [];
    let count = 0;

    text = text || "";
    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === " ") {
        elements.push(<React.Fragment key={`${i}spc1`}>&nbsp;</React.Fragment>);
      } else if (char === "\t") {
        elements.push(
          <React.Fragment key={`${i}spc2`}>
            <>&nbsp;</>
            <>&nbsp;</>
          </React.Fragment>
        );
      } else {
        elements.push(<React.Fragment key={`${i}char`}>{char}</React.Fragment>);
      }

      count++;

      // Insert <wbr /> with given indent every x characters
      if (count === split) {
        elements.push(<wbr key={i} />);
        for (let j = 0; j < indent; j++) {
          elements.push(
            <React.Fragment key={`${j}wbrspc`}>&nbsp;</React.Fragment>
          );
        }
        count = 0;
      }
    }

    return elements;
  };

  return <>{renderProcessedString()}</>;
}

function renderStacktraceFrameContext(
  start: number,
  context: string[],
  last?: boolean
) {
  const minLeadingSpaces = Math.min(
    ...context.map((row) => countLeadingSpaces(row))
  );
  const maxIndexLength = Math.max(
    ...context.map((_row, index) => (start + index).toString().length)
  );

  function padStringToEnd(input: string, desiredLength: number) {
    const numberOfSpaces = desiredLength - input.length;
    return input + " ".repeat(Math.max(0, numberOfSpaces));
  }

  return (
    <>
      {context.map((row, index) => (
        <Row key={index}>
          <Column>
            <span
              style={
                index === 3
                  ? stacktraceFrameContextImportant
                  : stacktraceFrameContext
              }
            >
              <FormattedCode
                split={68}
                indent={maxIndexLength + 2}
                text={`${padStringToEnd(
                  (start + index - 3).toString(),
                  maxIndexLength
                )}  ${row.substring(minLeadingSpaces)}`}
              />
            </span>
          </Column>
        </Row>
      ))}
      {!last && (
        <Row>
          <Column>
            <SurfaceHr />
          </Column>
        </Row>
      )}
    </>
  );
}

interface IssueEmailProps {
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
  message = "You hit a soft limit for Issues. You can re-enable it or contact us to have the limit lifted.",
  assetsUrl = LOCAL_ASSETS_URL,
  consoleUrl = "https://console.sst.dev",
}: IssueEmailProps) => {
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
              <Text style={{ ...compactText, ...issueBreadcrumb }}>
                <span>{workspace}</span>
                <span style={{ ...code, ...issueWorkspaceSeparator }}>:</span>
                <span>{app}</span>
                <span style={{ ...code, ...issueBreadcrumbSeparator }}>
                  &nbsp;/&nbsp;
                </span>
                <span>{stage}</span>
              </Text>
              <Text style={{ ...issueHeading, ...compactText }}>
                <Link style={code} href={url}>
                  <SplitString text={subject} split={40} />
                </Link>
              </Text>
              <Text style={{ ...compactText, ...code }}>
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
