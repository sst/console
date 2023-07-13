import { JSX } from "solid-js";
import { theme } from "$/ui/theme";
import { utility } from "$/ui/utility";
import { styled } from "@macaron-css/solid";
import { IconXCircle, IconExclamationTriangle } from "$/ui/icons";

const dangerBackground = `hsla(${theme.color.base.red}, 25%)`;

const AlertRoot = styled("div", {
  base: {
    ...utility.row(2.5),
    alignItems: "flex-start",
    backgroundColor: theme.color.background.surface,
    borderRadius: theme.borderRadius,
    padding: `${theme.space[4]} ${theme.space[4]}`,
  },
  variants: {
    level: {
      info: {
        backgroundColor: theme.color.background.surface,
      },
      danger: {
        backgroundColor: dangerBackground,
      },
    },
  },
  defaultVariants: {
    level: "info",
  },
});

const AlertIcon = styled("div", {
  base: {
    width: 18,
    height: 18,
    paddingTop: 1,
    opacity: theme.iconOpacity,
    selectors: {
      [`${AlertRoot.selector({ level: "info" })} &`]: {
        color: theme.color.text.secondary.base,
      },
      [`${AlertRoot.selector({ level: "danger" })} &`]: {
        color: `hsla(${theme.color.red.l2}, 100%)`,
      },
    },
  },
});

const AlertText = styled("div", {
  base: {
    fontSize: theme.font.size.sm,
    lineHeight: theme.font.lineHeight,
    selectors: {
      [`${AlertRoot.selector({ level: "info" })} &`]: {
        color: theme.color.text.secondary.base,
      },
      [`${AlertRoot.selector({ level: "danger" })} &`]: {
        color: `hsla(${theme.color.red.l2}, 100%)`,
      },
    },
  },
});

interface AlertProps {
  children: JSX.Element;
  level?: "info" | "danger";
}
export function Alert(props: AlertProps) {
  return (
    <AlertRoot level={props.level}>
      <AlertIcon>
        {props.level === "danger" ? (
          <IconXCircle />
        ) : (
          <IconExclamationTriangle />
        )}
      </AlertIcon>
      <AlertText>{props.children}</AlertText>
    </AlertRoot>
  );
}
