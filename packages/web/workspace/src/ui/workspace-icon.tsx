import { styled } from "@macaron-css/solid";
import { theme } from "./theme";
import { createMemo } from "solid-js";

interface AvatarSvgProps {
  text: string;
  round?: boolean;
  size?: number;
  bgColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
}
function generateAvatarSvg({
  text,
  size = 64,
  round = false,
  fontSize = 0.4,
  bgColor = "#395C6B",
  textColor = "#FFFBF9",
  fontWeight = "normal",
  fontFamily = "monospace",
}: AvatarSvgProps) {
  // From https://github.com/gilbitron/ui-avatar-svg
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}px" height="${size}px" viewBox="0 0 ${size} ${size}" version="1.1"><${
    round ? "circle" : "rect"
  } fill="${bgColor}" width="${size}" height="${size}" cx="${size / 2}" cy="${
    size / 2
  }" r="${
    size / 2
  }"/><text x="50%" y="50%" style="color: ${textColor};line-height: 1;font-family: ${fontFamily};" alignment-baseline="middle" text-anchor="middle" font-size="${Math.round(
    size * fontSize
  )}" font-weight="${fontWeight}" dy=".1em" dominant-baseline="middle" fill="${textColor}">${text}</text></svg>`;
}

interface WorkspaceIconProps {
  text: string;
}

const Icon = styled("span", {
  base: {
    flexShrink: 0,
    width: 36,
    height: 36,
    backgroundSize: "cover",
    borderRadius: theme.borderRadius,
  },
});

export function WorkspaceIcon(props: WorkspaceIconProps) {
  const svg = createMemo(() =>
    encodeURIComponent(
      generateAvatarSvg({
        text: props.text.slice(0, 2).toUpperCase(),
      })
    )
  );

  return (
    <Icon
      title={props.text}
      style={{
        "background-image": `url("data:image/svg+xml;utf8,${svg()}")`,
      }}
    />
  );
}
