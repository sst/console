import { styled } from "@macaron-css/solid";
import { theme } from "./theme";
import { CSSProperties } from "@macaron-css/core";

const primaryHover: CSSProperties = {
  borderColor: theme.color.button.primary.hover.border,
  backgroundColor: theme.color.button.primary.hover.color,
};
const primaryActive: CSSProperties = {
  backgroundColor: theme.color.button.primary.active,
  transform: "translateY(1px)",
  borderColor: "transparent",
  boxShadow: "none",
};
const secondaryHover: CSSProperties = {
  borderColor: theme.color.button.secondary.hover.border,
  backgroundColor: theme.color.button.secondary.hover.color,
};
const secoondaryActive: CSSProperties = {
  backgroundColor: theme.color.button.secondary.active,
  transform: "translateY(1px)",
  boxShadow: "none",
};
const dangerHover: CSSProperties = {
  borderColor: theme.color.button.danger.hover.border,
  backgroundColor: theme.color.button.danger.hover.color,
};
const dangerActive: CSSProperties = {
  backgroundColor: theme.color.button.danger.active,
  transform: "translateY(1px)",
  borderColor: "transparent",
  boxShadow: "none",
};
const githubHover: CSSProperties = {
  borderColor: theme.color.button.github.hover.border,
  backgroundColor: theme.color.button.github.hover.color,
};
const githubActive: CSSProperties = {
  backgroundColor: theme.color.button.github.active,
  transform: "translateY(1px)",
  borderColor: "transparent",
  boxShadow: "none",
};

export const Button = styled("button", {
  base: {
    appearance: "none",
    borderRadius: 4,
    border: "1px solid",
    padding: `0.625rem 1rem`,
    fontSize: `0.8125rem`,
    fontWeight: 500,
    lineHeight: "normal",
    fontFamily: theme.font.family.code,
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
        boxShadow: theme.color.button.primary.shadow,
        color: theme.color.button.primary.text,
        ":disabled": {
          borderColor: "transparent",
          boxShadow: "none",
          opacity: theme.color.button.primary.disabled.opacity,
        },
        selectors: {
          "&:hover": primaryHover,
          "&:active": primaryActive,
          "&[data-state-hover]": primaryHover,
          "&[data-state-active]": primaryActive,
        },
      },
      secondary: {
        backgroundColor: theme.color.button.secondary.color,
        borderColor: theme.color.button.secondary.border,
        boxShadow: theme.color.button.secondary.shadow,
        color: theme.color.button.secondary.text,
        ":disabled": {
          boxShadow: "none",
          opacity: theme.color.button.secondary.disabled.opacity,
        },
        selectors: {
          "&:hover": secondaryHover,
          "&:active": secoondaryActive,
          "&[data-state-hover]": secondaryHover,
          "&[data-state-active]": secoondaryActive,
        },
      },
      danger: {
        backgroundColor: theme.color.button.danger.color,
        borderColor: theme.color.button.danger.border,
        boxShadow: theme.color.button.danger.shadow,
        color: theme.color.button.danger.text,
        ":disabled": {
          borderColor: "transparent",
          boxShadow: "none",
          opacity: theme.color.button.danger.disabled.opacity,
        },
        selectors: {
          "&:hover": dangerHover,
          "&:active": dangerActive,
          "&[data-state-hover]": dangerHover,
          "&[data-state-active]": dangerActive,
        },
      },
      github: {
        backgroundColor: theme.color.button.github.color,
        borderColor: theme.color.button.github.border,
        boxShadow: theme.color.button.github.shadow,
        color: theme.color.button.github.text,
        ":disabled": {
          borderColor: "transparent",
          boxShadow: "none",
          opacity: theme.color.button.github.disabled.opacity,
        },
        selectors: {
          "&:hover": githubHover,
          "&:active": githubActive,
          "&[data-state-hover]": githubHover,
          "&[data-state-active]": githubActive,
        },
      },
    },
  },
  defaultVariants: {
    color: "primary",
  },
});

export const LinkButton = styled("span", {
  base: {
    fontWeight: 500,
    fontSize: theme.font.size.mono_sm,
    fontFamily: theme.font.family.code,
    color: theme.color.link.primary.base,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    ":hover": {
      color: theme.color.link.primary.hover,
    },
  },
});
