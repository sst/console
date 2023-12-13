// @ts-nocheck
import React from "react";
import {
  Font,
  Hr as JEHr,
  Text as JEText,
  HrProps as JEHrProps,
  TextProps as JETextProps,
} from "@jsx-email/all";
import { DIVIDER_COLOR, SURFACE_DIVIDER_COLOR, textColor } from "./styles";

export function Text(props: JETextProps) {
  return <JEText {...props} style={{ ...textColor, ...props.style }} />;
}

export function Hr(props: JEHrProps) {
  return (
    <JEHr
      {...props}
      style={{ borderTop: `1px solid ${DIVIDER_COLOR}`, ...props.style }}
    />
  );
}

export function SurfaceHr(props: JEHrProps) {
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

export function Fonts({ assetsUrl }: { assetsUrl: string }) {
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

export function SplitString({ text, split }: { text: string; split: number }) {
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
