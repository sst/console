import { styled } from "@macaron-css/solid";
import { theme } from "./theme";

const tipBackground = `hsla(${theme.color.base.blue}, 25%)`;
const dangerBackground = `hsla(${theme.color.base.red}, 25%)`;
const cautionBackground = `hsla(${theme.color.base.brand}, 25%)`;

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
        borderColor: theme.color.background.surface,
        backgroundColor: theme.color.background.surface,
        color: theme.color.text.dimmed.base,
      },
      tip: {
        borderColor: tipBackground,
        backgroundColor: tipBackground,
        color: `hsla(${theme.color.blue.l2}, 100%)`,
      },
      caution: {
        borderColor: cautionBackground,
        backgroundColor: cautionBackground,
        color: `hsla(${theme.color.brand.l2}, 100%)`,
      },
      danger: {
        borderColor: dangerBackground,
        backgroundColor: dangerBackground,
        color: `hsla(${theme.color.red.l2}, 100%)`,
      },
    },
    style: {
      solid: {
        padding: "6px 9px 5px",
        fontWeight: 500,
      },
      outline: {
        padding: "6px 8px 5px",
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
        color: theme.color.text.dimmed.base,
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
      },
    },
    {
      variants: {
        level: "tip",
        style: "outline",
      },
      style: {
        color: `hsla(${theme.color.base.blue}, 100%)`,
      },
    },
    {
      variants: {
        level: "caution",
        style: "outline",
      },
      style: {
        color: `hsla(${theme.color.base.brand}, 100%)`,
      },
    },
  ],
  defaultVariants: {
    size: "auto",
    level: "info",
    style: "solid",
  },
});
