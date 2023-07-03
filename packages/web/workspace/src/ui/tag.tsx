import { styled } from "@macaron-css/solid";
import { theme } from "./theme";

const infoColor = theme.color.background.surface;
const infoText = theme.color.text.dimmed;

const dangerColor = `hsla(${theme.color.base.red}, 25%)`;
const dangerText = `hsla(${theme.color.red.l2}, 100%)`;

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
    lineHeight: "normal",
    userSelect: "none",
    WebkitUserSelect: "none",
  },
  variants: {
    level: {
      info: {
        backgroundColor: infoColor,
        color: infoText,
      },
      danger: {
        backgroundColor: dangerColor,
        color: dangerText,
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
        width: 70,
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
        borderColor: dangerColor,
      },
    },
  ],
  defaultVariants: {
    size: "auto",
    level: "info",
    style: "solid",
  },
});
