import { DropdownMenu } from "@kobalte/core";
import { globalStyle } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { IconChevronDown } from "./icons";
import { Text } from "./text";
import { utility } from "./utility";
import { theme } from "./theme";
import {
  inputStyles,
  inputFocusStyles,
  inputDisabledStyles,
  inputDangerFocusStyles,
} from "./form";
import { JSX, Show, ComponentProps, ParentProps } from "solid-js";

const Trigger = styled(DropdownMenu.Trigger, {
  base: {
    ...utility.row(2),
    ...inputStyles,
    alignItems: "center",
    justifyContent: "space-between",
    ":focus": {
      ...inputFocusStyles,
    },
    ":invalid": {
      color: theme.color.text.dimmed.base,
    },
    ":disabled": {
      ...inputDisabledStyles,
    },
    maxWidth: 200,
  },
  variants: {
    size: {
      sm: {},
      base: {},
    },
    icon: {
      true: {
        padding: 0,
        boxShadow: "none",
        appearance: "none",
        background: "none",
      },
      false: {},
    },
  },
  compoundVariants: [
    {
      variants: {
        size: "sm",
        icon: false,
      },
      style: {
        height: theme.input.size.sm,
      },
    },
    {
      variants: {
        size: "base",
        icon: false,
      },
      style: {
        height: theme.input.size.base,
      },
    },
  ],
  defaultVariants: {
    size: "base",
    icon: false,
  },
});

const DownIcon = styled(DropdownMenu.Icon, {
  base: {
    width: 20,
    height: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: theme.iconOpacity,
    color: theme.color.icon.primary,
    flexShrink: 0,
    selectors: {
      "&[data-expanded]": {
        transform: "rotate(180deg)",
      },
    },
  },
});

const TriggerIcon = styled("span", {
  base: {
    display: "flex",
    color: theme.color.icon.secondary,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    ":hover": {
      color: theme.color.icon.primary,
    },
  },
});

const Content = styled(DropdownMenu.Content, {
  base: {
    marginTop: theme.space[1],
    padding: `${theme.space[1]} 0`,
    border: `1px solid ${theme.color.divider.base}`,
    borderRadius: theme.borderRadius,
    background: theme.color.background.popup,
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    boxShadow: theme.color.shadow.drop.medium,
    width: 220,
  },
});

const Item = styled(DropdownMenu.Item, {
  base: {
    ...utility.textLine(),
    lineHeight: "normal",
    padding: `${theme.space[2.5]} ${theme.space[3]}`,
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary.base,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      "&[data-highlighted]": {
        color: theme.color.text.primary.surface,
        backgroundColor: theme.color.background.hover,
      },
    },
  },
});

const RadioGroup = styled(DropdownMenu.RadioGroup, {});

const RadioItem = styled(DropdownMenu.RadioItem, {
  base: {
    ...utility.row(2),
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${theme.space[2.5]} ${theme.space[3]}`,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    color: theme.color.text.secondary.base,
    lineHeight: "normal",
    fontSize: theme.font.size.sm,
    userSelect: "none",
    outline: "none",
    selectors: {
      "&[data-highlighted]": {
        color: theme.color.text.primary.surface,
        backgroundColor: theme.color.background.hover,
      },
      "&[data-disabled]": {
        color: theme.color.text.dimmed.surface,
        pointerEvents: "none",
      },
    },
  },
});

const RadioItemLabel = styled("span", {
  base: {
    ...utility.textLine(),
    selectors: {
      [`${RadioItem} &`]: {
        color: theme.color.text.primary.surface,
        backgroundColor: theme.color.background.hover,
      },
    },
  },
});

const ItemIndicator = styled(DropdownMenu.ItemIndicator, {
  base: {
    opacity: theme.iconOpacity,
    display: "flex",
    alignItems: "center",
  },
});

const Seperator = styled(DropdownMenu.Separator, {
  base: {
    height: 1,
    margin: `${theme.space[1]} 0`,
    backgroundColor: theme.color.divider.surface,
    border: 0,
  },
});

type Props = ComponentProps<typeof DropdownMenu.Root> & {
  icon?: JSX.Element;
  size?: "sm" | "base";
  label?: string;
};

export function Dropdown(props: Props) {
  return (
    <DropdownMenu.Root {...props}>
      <Trigger size={props.size} icon={props.icon !== undefined}>
        <Show
          when={props.icon}
          fallback={
            <>
              <Text
                line
                leading="normal"
                color="secondary"
                size={props.size === "sm" ? "xs" : "sm"}
              >
                {props.label}
              </Text>
              <DownIcon>
                <IconChevronDown width={15} height={15} />
              </DownIcon>
            </>
          }
        >
          <TriggerIcon>{props.icon}</TriggerIcon>
        </Show>
      </Trigger>
      <DropdownMenu.Portal mount={document.getElementById("styled")!}>
        <Content>{props.children}</Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

Dropdown.Item = Item;
Dropdown.RadioItem = RadioItem;
Dropdown.Seperator = Seperator;
Dropdown.RadioGroup = RadioGroup;
Dropdown.ItemIndicator = ItemIndicator;
Dropdown.RadioItemLabel = RadioItemLabel;
