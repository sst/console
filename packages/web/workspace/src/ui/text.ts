import {CSSProperties} from "@macaron-css/core";
import {styled} from "@macaron-css/solid";
import {theme} from "./theme";

export const Text = styled("span", {
  base: {},
  variants: {
    leading: {
      base: {
        lineHeight: 1,
      },
      loose: {
        lineHeight: theme.font.lineHeight,
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
      return result;
    })(),
    color: {
      primary: {},
      secondary: {},
      dimmed: {},
    },
    on: {
      base: {},
      surface: {},
      inverted: {},
    },
  },
  compoundVariants: [
    {
      variants: {
        color: "primary",
        on: "base",
      },
      style: {
        color: theme.color.text.primary.base,
      },
    },
    {
      variants: {
        color: "primary",
        on: "surface",
      },
      style: {
        color: theme.color.text.primary.surface,
      },
    },
    {
      variants: {
        color: "primary",
        on: "inverted",
      },
      style: {
        color: theme.color.text.primary.inverted,
      },
    },
    {
      variants: {
        color: "secondary",
        on: "base",
      },
      style: {
        color: theme.color.text.secondary.base,
      },
    },
    {
      variants: {
        color: "secondary",
        on: "surface",
      },
      style: {
        color: theme.color.text.secondary.surface,
      },
    },
    {
      variants: {
        color: "secondary",
        on: "inverted",
      },
      style: {
        color: theme.color.text.secondary.inverted,
      },
    },
    {
      variants: {
        color: "dimmed",
        on: "base",
      },
      style: {
        color: theme.color.text.dimmed.base,
      },
    },
    {
      variants: {
        color: "dimmed",
        on: "surface",
      },
      style: {
        color: theme.color.text.dimmed.surface,
      },
    },
    {
      variants: {
        color: "dimmed",
        on: "inverted",
      },
      style: {
        color: theme.color.text.dimmed.inverted,
      },
    },
  ],
  defaultVariants: {
    on: "base",
    size: "base",
    color: "primary",
    weight: "regular",
  },
});
