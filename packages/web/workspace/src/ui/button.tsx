import { styled } from "@macaron-css/solid";
import { JSX, ComponentProps } from "solid-js";
import { theme } from "./theme";
import { IconCheck } from "$/ui/icons";
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
    padding: `0 1rem`,
    height: 40,
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

const textButtonBaseHover: CSSProperties = {
  color: theme.color.text.primary.base,
};
const textButtonSurfaceHover: CSSProperties = {
  color: theme.color.text.primary.surface,
};

const TextButtonRoot = styled("span", {
  base: {
    fontSize: theme.font.size.sm,
    transition: `color ${theme.colorFadeDuration} ease-out`,
  },
  variants: {
    on: {
      base: {
        color: theme.color.text.secondary.base,
        selectors: {
          "&:hover": textButtonBaseHover,
          "&[data-state-hover]": textButtonBaseHover,
        },
      },
      surface: {
        color: theme.color.text.secondary.surface,
        selectors: {
          "&:hover": textButtonSurfaceHover,
          "&[data-state-hover]": textButtonSurfaceHover,
        },
      },
    },
    completing: {
      true: {},
      false: {},
    },
  },
  compoundVariants: [
    {
      variants: {
        completing: true,
        on: "base",
      },
      style: {
        color: theme.color.text.secondary.base,
        ":hover": {
          color: theme.color.text.secondary.base,
        },
      },
    },
    {
      variants: {
        completing: true,
        on: "surface",
      },
      style: {
        color: theme.color.text.secondary.surface,
        ":hover": {
          color: theme.color.text.secondary.surface,
        },
      },
    },
  ],
  defaultVariants: {
    on: "base",
    completing: false,
  },
});

const TextButtonIcon = styled("span", {
  base: {
    width: 14,
    height: 14,
    marginRight: 4,
    verticalAlign: -2,
    display: "inline-block",
    opacity: theme.iconOpacity,
    selectors: {
      [`${TextButtonRoot.selector({ completing: true })} &`]: {
        color: theme.color.accent,
      },
    },
  },
});

type TextButtonProps = ComponentProps<typeof TextButtonRoot> & {
  icon?: JSX.Element;
  completing?: boolean;
};

export function TextButton(props: TextButtonProps) {
  return (
    <TextButtonRoot {...props}>
      {props.completing ? (
        <TextButtonIcon>
          <IconCheck />
        </TextButtonIcon>
      ) : (
        <TextButtonIcon>{props.icon}</TextButtonIcon>
      )}
      {props.children}
    </TextButtonRoot>
  );
}
