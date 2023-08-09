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
    animationDelay: "0.3s",
    animation: "1s delayedFadeIn",
    animationFillMode: "forwards",
    color: theme.color.icon.dimmed,
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

export function Splash() {
  return (
    <Fullscreen>
      <LogoIcon>
        <IconApp />
      </LogoIcon>
    </Fullscreen>
  );
}
