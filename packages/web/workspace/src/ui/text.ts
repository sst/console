import { CSSProperties } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { theme } from "./theme";

export const Text = styled("span", {
  base: {},
  variants: {
    leading: {
      base: {
        lineHeight: 1,
      },
      loose: {
        lineHeight: 1.5,
      },
    },
    weight: {
      regular: {
        fontWeight: 400,
      },
      medium: {
        fontWeight: 500,
      },
      semibold: {
        fontWeight: 600,
      },
    },
    size: (() => {
      const result = {} as Record<`${keyof typeof theme.font.size}`, any>;
      for (const [key, value] of Object.entries(theme.font.size)) {
        result[key as keyof typeof theme.font.size] = {
          fontSize: value,
        };
      }
      console.log(result);
      return result;
    })(),
  },
  defaultVariants: {
    weight: "regular",
    size: "base",
  },
});
