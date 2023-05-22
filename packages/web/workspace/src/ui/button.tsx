import { styled } from "@macaron-css/solid";
import { theme } from "./theme";

export const Button = styled("button", {
  base: {
    appearance: "none",
    borderRadius: 4,
    border: "1px solid",
    padding: `0.625rem 1rem`,
    fontSize: `0.8125rem`,
    fontWeight: 500,
    lineHeight: 1,
    fontFamily: theme.fonts.code,
    transitionDelay: "0s, 0s",
    transitionDuration: "0.2s, 0.2s",
    transitionProperty: "background-color, border",
    transitionTimingFunction: "ease-out, ease-out",
    ":disabled": {
      pointerEvents: "none",
    },
  },
  variants: {
    color: {
      primary: {
        backgroundColor: theme.color.button.primary.color,
        borderColor: theme.color.button.primary.border,
        boxShadow: theme.color.shadow.button.accent,
        color: theme.color.text.primary.accent,
        ":hover": {
          borderColor: theme.color.button.primary.hover.border,
          backgroundColor: theme.color.button.primary.hover.color,
        },
        ":active": {
          backgroundColor: theme.color.button.primary.active,
          transform: "translateY(1px)",
          borderColor: "transparent",
          boxShadow: "none",
        },
        ":disabled": {
          borderColor: "transparent",
          boxShadow: "none",
          opacity: theme.color.button.primary.disabled.opacity,
        },
      },
      secondary: {
        backgroundColor: theme.color.button.secondary.color,
        borderColor: theme.color.button.secondary.border,
        boxShadow: theme.color.shadow.button.base,
        color: theme.color.text.primary.surface,
        ":hover": {
          borderColor: theme.color.button.secondary.hover.border,
          backgroundColor: theme.color.button.secondary.hover.color,
        },
        ":active": {
          backgroundColor: theme.color.button.secondary.active,
          transform: "translateY(1px)",
          boxShadow: "none",
        },
        ":disabled": {
          boxShadow: "none",
          opacity: theme.color.button.secondary.disabled.opacity,
        },
      },
      danger: {
        backgroundColor: theme.color.button.danger.color,
        borderColor: theme.color.button.danger.border,
        boxShadow: theme.color.shadow.button.danger,
        color: theme.color.text.primary.danger,
        ":hover": {
          borderColor: theme.color.button.danger.hover.border,
          backgroundColor: theme.color.button.danger.hover.color,
        },
        ":active": {
          backgroundColor: theme.color.button.danger.active,
          transform: "translateY(1px)",
          borderColor: "transparent",
          boxShadow: "none",
        },
        ":disabled": {
          borderColor: "transparent",
          boxShadow: "none",
          opacity: theme.color.button.danger.disabled.opacity,
        },
      },
    },
  },
});
