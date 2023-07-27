import { DropdownMenu } from "@kobalte/core";
import { globalStyle, style } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { IconChevronDown } from "./icons";
import { Text } from "./text";
import { utility } from "./utility";
import { theme } from "./theme";
import { ComponentProps, ParentProps } from "solid-js";

const Trigger = styled(DropdownMenu.Trigger, {
  base: {
    ...utility.row(2),
    border: 0,
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: theme.borderRadius,
    padding: `0 ${theme.space[2]} 0 ${theme.space[3]}`,
    backgroundColor: theme.color.input.background,
    transition: `box-shadow ${theme.colorFadeDuration} ease-out`,
    maxWidth: 200,
    boxShadow: `
      0 0 0 1px inset ${theme.color.input.border},
      ${theme.color.input.shadow}
    `,
  },
  variants: {
    size: {
      sm: {
        height: 32,
      },
      base: {
        height: 40,
      },
    },
  },
  defaultVariants: {
    size: "base",
  },
});

const Icon = styled(DropdownMenu.Icon, {
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
    padding: `${theme.space[3]} ${theme.space[3.5]}`,
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
    padding: `${theme.space[3]} ${theme.space[3.5]}`,
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
  size?: "sm" | "base";
  label: string;
};

export function Dropdown(props: Props) {
  return (
    <DropdownMenu.Root {...props}>
      <Trigger size={props.size}>
        <Text line color="secondary" size={props.size === "sm" ? "xs" : "sm"}>
          {props.label}
        </Text>
        <Icon>
          <IconChevronDown width={15} height={15} />
        </Icon>
      </Trigger>
      <DropdownMenu.Portal mount={document.getElementById("styled")!}>
        <Content>{props.children}</Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

Dropdown.Item = Item;
Dropdown.RadioGroup = RadioGroup;
Dropdown.RadioItem = RadioItem;
Dropdown.Seperator = Seperator;
