import { styled } from "@macaron-css/solid";
import { IconApp } from "./icons/custom";
import { Fullscreen } from "./layout";
import { theme } from "./theme";
import { globalKeyframes } from "@macaron-css/core";

const LogoIcon = styled("div", {
  base: {
    width: 42,
    height: 42,
    opacity: 0,
    color: theme.color.icon.dimmed,
  },
  variants: {
    pulse: {
      true: {
        animation: "logo-pulse 2.2s linear infinite alternate",
      },
      false: {
        animationDelay: "0.3s",
        animation: "1s delayedFadeIn",
        animationFillMode: "forwards",
      },
    },
  },
  defaultVariants: {
    pulse: false,
  },
});

globalKeyframes("delayedFadeIn", {
  "0%": {
    opacity: 0,
  },
  "100%": {
    opacity: 1,
  },
});

globalKeyframes("logo-pulse", {
  "0%": {
    opacity: 0.3,
  },
  "50%": {
    opacity: 1,
  },
  "100%": {
    opacity: 0.3,
  },
});

interface SplashProps {
  pulse?: boolean;
}
export function Splash(props: SplashProps) {
  return (
    <Fullscreen>
      <LogoIcon pulse={props.pulse}>
        <IconApp />
      </LogoIcon>
    </Fullscreen>
  );
}
