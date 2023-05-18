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
  },
  variants: {
    color: {
      danger: {
        backgroundColor: theme.color.button.danger.background,
        borderColor: theme.color.button.danger.border,
        boxShadow: theme.color.shadow.button.danger,
        color: theme.color.text.primary.danger,
        ":hover": {
          borderColor: theme.color.button.danger.borderHover,
          backgroundColor: theme.color.button.danger.backgroundHover,
        },
        ":active": {
          backgroundColor: theme.color.button.danger.backgroundActive,
          transform: "translateY(1px)",
          boxShadow: "none",
        },
      },
    },
  },
});
