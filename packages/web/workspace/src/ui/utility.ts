import { CSSProperties } from "@macaron-css/core";
import { theme } from "./theme";

export const utility = {
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
    } satisfies CSSProperties;
  },
};
