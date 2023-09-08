import { JSX } from "solid-js";
import { theme } from "$/ui/theme";
import { utility, Row } from "$/ui";
import { styled } from "@macaron-css/solid";
import { ComponentProps, Show } from "solid-js";
import { IconXCircle, IconExclamationTriangle } from "$/ui/icons";

const AlertRoot = styled("div", {
  base: {
    ...utility.row(3),
    alignItems: "center",
    justifyContent: "space-between",
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
        backgroundColor: theme.color.background.red,
      },
    },
  },
  defaultVariants: {
    level: "info",
  },
});

const AlertIcon = styled("div", {
  base: {
    width: 16,
    height: 16,
    paddingTop: 3,
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

const AlertDetails = styled(AlertText, {
  base: {
    textDecoration: "underline",
    textUnderlineOffset: 2,
  },
});

type AlertProps = ComponentProps<typeof AlertRoot> & {
  hasDetails?: boolean;
};
export function Alert(props: AlertProps) {
  return (
    <AlertRoot {...props}>
      <Row space="2.5" vertical="start">
        <AlertIcon>
          {props.level === "danger" ? (
            <IconXCircle />
          ) : (
            <IconExclamationTriangle />
          )}
        </AlertIcon>
        <AlertText>{props.children}</AlertText>
      </Row>
      <Show when={props.hasDetails}>
        <AlertDetails>Details</AlertDetails>
      </Show>
    </AlertRoot>
  );
}
