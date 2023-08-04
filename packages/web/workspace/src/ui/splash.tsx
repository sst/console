import { styled } from "@macaron-css/solid";
import { IconApp } from "./icons/custom";
import { Fullscreen } from "./layout";
import { theme } from "./theme";

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

export function Splash() {
  return (
    <Fullscreen>
      <LogoIcon>
        <IconApp />
      </LogoIcon>
    </Fullscreen>
  );
}
