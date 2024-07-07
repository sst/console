import { CSSProperties } from "@macaron-css/core";
import { theme } from "./theme";

export const utility = {
  textLine() {
    return {
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    };
  },
  stack(space: keyof (typeof theme)["space"]) {
    return {
      display: "flex",
      flexDirection: "column",
      gap: theme.space[space],
    } satisfies CSSProperties;
  },
  row(space: keyof (typeof theme)["space"]) {
    return {
      display: "flex",
      gap: theme.space[space],
    };
  },

  text: {
    line: {
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    },
    label: {
      fontWeight: 500,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      fontFamily: theme.font.family.code,
    },
    pre: {
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
    },
  },
};
