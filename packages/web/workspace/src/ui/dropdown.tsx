import { DropdownMenu } from "@kobalte/core";
import { globalStyle, style } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { IconChevronDown } from "./icons";
import { Text } from "./text";
import { utility } from "./utility";
import { theme } from "./theme";
import { JSX, Show, ComponentProps, ParentProps } from "solid-js";

const Trigger = styled(DropdownMenu.Trigger, {
  base: {
    ...utility.row(2),
    border: 0,
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: theme.borderRadius,
    transition: `box-shadow ${theme.colorFadeDuration} ease-out`,
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
        appearance: "none",
        background: "none",
      },
      false: {
        padding: `0 ${theme.space[2]} 0 ${theme.space[3]}`,
        backgroundColor: theme.color.input.background,
        boxShadow: `
      0 0 0 1px inset ${theme.color.input.border},
      ${theme.color.input.shadow}
    `,
      },
    },
  },
  compoundVariants: [
    {
      variants: {
        size: "sm",
        icon: false,
      },
      style: {
        height: theme.input.size.base,
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
    background: theme.color.background.modal,
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
      "&[data-checked]": {
        color: theme.color.text.primary.surface,
        backgroundColor: theme.color.background.selected,
      },
    },
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
