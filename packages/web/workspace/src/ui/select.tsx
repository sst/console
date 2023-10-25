import { Select as KSelect, Separator as KSeperator } from "@kobalte/core";
import { style } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { IconCheck, IconChevronDown } from "./icons";
import { Text } from "./text";
import { utility } from "./utility";
import { theme } from "./theme";
import { inputStyles, inputFocusStyles, inputDisabledStyles } from "./form";
import { JSX, Show, ComponentProps } from "solid-js";

const Trigger = styled(KSelect.Trigger, {
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
    maxWidth: 220,
  },
  variants: {
    size: {
      sm: {
        height: theme.input.size.sm,
      },
      base: {
        height: theme.input.size.base,
      },
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
    disabled: {
      true: {
        ...inputDisabledStyles,
      },
      false: {},
    },
  },
  defaultVariants: {
    size: "base",
    icon: false,
  },
});

const DownIcon = styled(KSelect.Icon, {
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

const Content = styled(KSelect.Content, {
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

const listbox = style({
  overflowY: "auto",
  maxHeight: 360,
});

const Item = styled(KSelect.Item, {
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

const ItemLabel = styled("span", {
  base: {
    ...utility.textLine(),
  },
});

const ItemIndicator = styled(KSelect.ItemIndicator, {
  base: {
    opacity: theme.iconOpacity,
    display: "flex",
    alignItems: "center",
  },
});

const Seperator = styled(KSeperator.Root, {
  base: {
    height: 1,
    margin: `${theme.space[1]} 0`,
    backgroundColor: theme.color.divider.surface,
    border: 0,
  },
});

// @ts-expect-error
const Listbox = styled(KSelect.Listbox, {
  base: {
    selectors: {
      "&::-webkit-scrollbar": {
        width: 0,
        background: "transparent",
      },
    },
  },
});

type Option<T> = {
  label?: string;
  value: T;
  seperator?: boolean;
};
type Props<T> = ComponentProps<typeof KSelect.Root<Option<T>>> & {
  icon?: JSX.Element;
  size?: "sm" | "base";
  label?: string;
  disabled?: boolean;
  triggerClass?: string;
};

export function Select<T>(props: Props<T>) {
  return (
    <KSelect.Root<Option<T>>
      {...props}
      optionValue="value"
      optionTextValue="label"
      itemComponent={(props) => (
        <>
          <Item item={props.item}>
            <ItemLabel>{props.item.textValue}</ItemLabel>
            <ItemIndicator>
              <IconCheck width={14} height={14} />
            </ItemIndicator>
          </Item>
          <Show when={props.item.rawValue.seperator}>
            <Seperator />
          </Show>
        </>
      )}
    >
      <Trigger
        size={props.size}
        disabled={props.disabled}
        class={props.triggerClass}
        icon={props.icon !== undefined}
      >
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
                <KSelect.Value<Option<T>>>
                  {(state) =>
                    state.selectedOptions().length > 1
                      ? state.selectedOptions().length + " selected"
                      : state.selectedOption()?.label
                  }
                </KSelect.Value>
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
      <KSelect.Portal mount={document.getElementById("styled")!}>
        <Content>
          <Listbox class={listbox} />
        </Content>
      </KSelect.Portal>
    </KSelect.Root>
  );
}
