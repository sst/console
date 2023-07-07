import { styled } from "@macaron-css/solid";
import { theme } from "./theme";
import { CSSProperties } from "@macaron-css/core";

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
    color: (() => {
      const record = {} as Record<keyof typeof theme.color.text, CSSProperties>;
      for (const [key, _value] of Object.entries(theme.color.text)) {
        record[key as keyof typeof record] = {};
      }
      return record;
    })(),
    on: (() => {
      const record = {} as Record<
        keyof typeof theme.color.text.primary,
        CSSProperties
      >;
      for (const [key, _value] of Object.entries(theme.color.text.primary)) {
        record[key as keyof typeof record] = {};
      }
      return record;
    })(),
  },
  compoundVariants: (() => {
    const result: any[] = [];
    for (const [color, ons] of Object.entries(theme.color.text)) {
      for (const [on, value] of Object.entries(ons)) {
        result.push({
          variants: {
            color,
            on,
          },
          style: {
            color: value,
          },
        });
      }
    }
    console.log(result);
    return result;
  })(),
  defaultVariants: {
    on: "base",
    size: "base",
    color: "primary",
    weight: "regular",
  },
});
