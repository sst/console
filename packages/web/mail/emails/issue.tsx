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
  Heading,
  Section,
  Container,
  Hr as REHr,
  Text as REText,
  HrProps as REHrProps,
  TextProps as RETextProps,
} from "@react-email/components";

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

const container = {};

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
  fontFamily: "IBM Plex Mono, mono-space",
};

const tableCell = {
  display: "table-cell",
};

const headingHr = {
  margin: `${unit}px 0`,
};

const buttonPrimary = {
  ...code,
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

const issueBreadcrumbSeparator = {
  color: DIVIDER_COLOR,
};

const issueHeading = {
  ...code,
  fontSize: "22px",
  fontWeight: 500,
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

function insertWbr(
  input: string,
  padding: number = 5,
  interval: number = 60
): string {
  let result = "";
  for (let i = 0; i < input.length; i++) {
    result += input[i];
    if ((i + 1) % interval === 0) {
      result += "\n" + " ".repeat(padding);
    }
  }
  return result;
}

function countLeadingSpaces(str: string) {
  let count = 0;
  for (let char of str) {
    if (char === " ") {
      count++;
    } else if (char === "\t") {
      count += 4;
    } else {
      break;
    }
  }
  return count;
}

function Text(props: RETextProps) {
  return <REText {...props} style={{ ...textColor, ...props.style }} />;
}

function Hr(props: REHrProps) {
  return (
    <REHr
      {...props}
      style={{ borderTop: `1px solid ${DIVIDER_COLOR}`, ...props.style }}
    />
  );
}

function SurfaceHr(props: REHrProps) {
  return (
    <REHr
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
          url: `${assetsUrl}/ibm-plex-mono-latin-500.woff2`,
          format: "woff2",
        }}
        fontWeight="500"
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

type StacktraceContext = {
  line: string;
  index: number;
};
type StacktraceFrame = {
  file: string;
  line?: number;
  column?: number;
  important?: boolean;
  context?: StacktraceContext[];
};

interface IssueEmailProps {
  url: string;
  app: string;
  name: string;
  stage: string;
  message: string;
  assetsUrl: string;
  stacktrace?: StacktraceFrame[];
  stacktraceRaw?: string[];
}
const IssueEmail = ({
  app = "console",
  stage = "production",
  name = "NoSuchBucket",
  assetsUrl = LOCAL_ASSETS_URL,
  message = "The specified bucket does not exist",
  url = "https://console.sst.dev/sst/console/production/issues/pioksmvi6x2sa9zdljvn8ytw",
  stacktrace = [
    {
      file: "node_modules/.pnpm/@smithy+smithy-client@2.1.3/node_modules/@smithy/smithy-client/dist-es/default-error-handler.js",
      line: 23,
      column: 17,
    },
    {
      file: "node_modules/.pnpm/@smithy+smithy-client@2.1.3/node_modules/@smithy/smithy-client/dist-es/operation.js",
      line: 49,
      column: 28,
    },
    {
      file: "packages/core/src/issue/index.ts",
      line: 147,
      column: 35,
      important: true,
      context: [
        {
          line: "    const key = `stackMetadata/path/that/is/too/long/and/will/overflow/app.${row.app}/stage.${row.stage}/`;",
          index: 150,
        },
        {
          line: '    console.log("listing", key, "for", bucket);',
          index: 148,
        },
        {
          line: "    const list = await s3",
          index: 149,
        },
        {
          line: "      .send(",
          index: 150,
        },
        {
          line: "        new ListObjectsV2Command({",
          index: 151,
        },
        {
          line: "          Prefix: key,",
          index: 152,
        },
        {
          line: "          Bucket: bucket,",
          index: 153,
        },
      ],
    },
  ],
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
                  height="32"
                  alt="SST Logo"
                  src={`${assetsUrl}/sst-logo.png`}
                />
              </Column>
              <Column align="right">
                <Button pX={18} pY={12} style={buttonPrimary} href={url}>
                  <span style={code}>View Issue</span>
                </Button>
              </Column>
            </Section>

            <Section style={headingHr}>
              <Hr />
            </Section>

            <Section>
              <Text style={{ ...compactText, ...issueBreadcrumb }}>
                <span>{app}</span>
                <span style={{ ...code, ...issueBreadcrumbSeparator }}>
                  &nbsp;/&nbsp;
                </span>
                <span>{stage}</span>
              </Text>
              <Text style={{ ...issueHeading, ...compactText }}>
                <Link style={code} href={url}>
                  {name}
                </Link>
              </Text>
              <Text style={{ ...compactText, ...code }}>{message}</Text>
            </Section>

            <Section style={{ padding: `${unit * 1.5}px 0 0 0` }}>
              <Row>
                <Text style={sectionLabel}>STACK TRACE</Text>
              </Row>
              <Section style={stacktraceContainer}>
                {stacktrace.map((frame, index) => (
                  <>
                    <Row key={index}>
                      <span
                        style={
                          frame.important
                            ? stacktraceFrameFileImportant
                            : stacktraceFrame
                        }
                      >
                        {frame.file}
                      </span>
                      &nbsp;&nbsp;
                      <span
                        style={
                          frame.important
                            ? stacktraceFramePositionImportant
                            : stacktraceFrame
                        }
                      >
                        {frame.line}
                      </span>
                      <span style={stacktraceFrame}>:</span>
                      <span
                        style={
                          frame.important
                            ? stacktraceFramePositionImportant
                            : stacktraceFrame
                        }
                      >
                        {frame.column}
                      </span>
                    </Row>
                    {index < stacktrace.length - 1 && (
                      <Row>
                        <SurfaceHr />
                      </Row>
                    )}
                    {frame.context &&
                      renderStacktraceFrameContext(frame.context)}
                  </>
                ))}
              </Section>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

function renderStacktraceFrameContext(context: StacktraceContext[]) {
  const minLeadingSpaces = Math.min(
    ...context.map((row) => countLeadingSpaces(row.line))
  );

  return (
    <>
      <Row>
        <SurfaceHr />
      </Row>
      {context.map((row, index) => (
        <Row>
          <pre
            style={
              index === 3
                ? stacktraceFrameContextImportant
                : stacktraceFrameContext
            }
          >
            {row.index}
            {"  "}
            {insertWbr(
              row.line.substring(minLeadingSpaces),
              row.index.toString().length +
                2 +
                countLeadingSpaces(row.line.substring(minLeadingSpaces))
            )}
          </pre>
        </Row>
      ))}
    </>
  );
}

export default IssueEmail;
