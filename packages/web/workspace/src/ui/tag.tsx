import { styled } from "@macaron-css/solid";
import { theme } from "./theme";

export const Tag = styled("div", {
  base: {
    flex: "0 0 auto",
    letterSpacing: 0.5,
    justifyContent: "center",
    textAlign: "center",
    fontSize: theme.font.size.xs,
    padding: `0 ${theme.space[3]}`,
    height: 28,
    display: "flex",
    alignItems: "center",
    textTransform: "uppercase",
    borderRadius: theme.borderRadius,
    boxSizing: "border-box",
    lineHeight: "normal",
  },
  variants: {
    level: {
      info: {
        backgroundColor: theme.color.tag.info.color,
        color: theme.color.tag.info.text,
      },
      danger: {
        backgroundColor: theme.color.tag.danger.color,
        color: theme.color.tag.danger.text,
      },
    },
    style: {
      solid: {
        padding: "6px 9px 5px",
        fontWeight: 500,
      },
      outline: {
        borderWidth: 1,
        borderStyle: "solid",
        backgroundColor: "transparent",
      },
    },
    size: {
      large: {
        width: 120,
      },
      small: {
        width: 85,
      },
      auto: {},
    },
  },
  compoundVariants: [
    {
      variants: {
        level: "info",
        style: "outline",
      },
      style: {
        color: theme.color.text.dimmed,
        borderColor: theme.color.divider.base,
      },
    },
    {
      variants: {
        level: "danger",
        style: "outline",
      },
      style: {
        color: `hsla(${theme.color.base.red}, 100%)`,
        borderColor: theme.color.tag.danger.color,
      },
    },
  ],
  defaultVariants: {
    size: "auto",
    level: "info",
    style: "solid",
  },
});
