import { JSX, createSignal } from "solid-js";
import { theme } from "$/ui/theme";
import { utility, Row, Text, Stack } from "$/ui";
import { style } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { ComponentProps, Show } from "solid-js";
import { IconXCircle, IconExclamationTriangle } from "$/ui/icons";

const AlertRoot = styled("div", {
  base: {
    padding: theme.space[4],
    borderRadius: theme.borderRadius,
    backgroundColor: theme.color.background.surface,
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
});

const AlertIcon = styled("div", {
  base: {
    flex: "0 0 auto",
    width: 16,
    height: 16,
    marginTop: 3,
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

const AlertDetails = styled("div", {
  base: {
    borderStyle: "solid",
    borderWidth: "1px 0 0 0",
    paddingTop: theme.space[3],
    selectors: {
      [`${AlertRoot.selector({ level: "info" })} &`]: {
        borderColor: theme.color.divider.surface,
      },
      [`${AlertRoot.selector({ level: "danger" })} &`]: {
        borderColor: theme.color.divider.danger,
      },
    },
  },
});

const AlertDetailsText = styled("div", {
  base: {
    overflowY: "auto",
    maxHeight: 140,
  },
});

const alertDetailsTextCs = style({
  selectors: {
    [`${AlertRoot.selector({ level: "info" })} &`]: {
      color: theme.color.text.secondary.base,
    },
    [`${AlertRoot.selector({ level: "danger" })} &`]: {
      color: `hsla(${theme.color.red.l2}, 100%)`,
    },
  },
});

type AlertProps = ComponentProps<typeof AlertRoot> & {
  details?: JSX.Element;
  controls?: JSX.Element;
};
export function Alert(props: AlertProps) {
  const [expanded, setExpanded] = createSignal(false);

  return (
    <AlertRoot {...props}>
      <Row space="4" vertical="start" horizontal="between">
        <Row flex space="2.5" vertical="start">
          <AlertIcon>
            {props.level === "danger" ? (
              <IconXCircle />
            ) : (
              <IconExclamationTriangle />
            )}
          </AlertIcon>
          <Stack flex space="3" style={{ flex: "1" }}>
            <AlertText>{props.children}</AlertText>
            <Show when={expanded()}>
              <AlertDetails>
                <Stack space="4">
                  <Show when={props.details}>
                    <AlertDetailsText>
                      <Text
                        pre
                        size="sm"
                        leading="loose"
                        class={alertDetailsTextCs}
                      >
                        {props.details}
                      </Text>
                    </AlertDetailsText>
                  </Show>
                  <Show when={props.controls}>{props.controls}</Show>
                </Stack>
              </AlertDetails>
            </Show>
          </Stack>
        </Row>
        <Show when={props.details}>
          <Text
            underline
            size="xs"
            class={alertDetailsTextCs}
            style={{ "margin-top": "4px" }}
            onClick={() => setExpanded(!expanded())}
          >
            <Show when={!expanded()} fallback="Hide">
              Details
            </Show>
          </Text>
        </Show>
      </Row>
    </AlertRoot>
  );
}
