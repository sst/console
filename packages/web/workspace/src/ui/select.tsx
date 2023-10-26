import { Select as KSelect, Separator as KSeperator } from "@kobalte/core";
import { style } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { IconCheck, IconChevronDown } from "./icons";
import { Text } from "./text";
import { utility } from "./utility";
import { theme } from "./theme";
import {
  Root,
  inputStyles,
  inputFocusStyles,
  inputDisabledStyles,
  inputDangerTextStyles,
  inputDangerFocusStyles,
} from "./form";
import { JSX, Show, splitProps, createEffect, createSignal } from "solid-js";

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
    width: "100%",
    selectors: {
      [`${Root.selector({ color: "danger" })} &`]: {
        ...inputDangerFocusStyles,
      },
    },
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
  },
  defaultVariants: {
    size: "base",
  },
});

const triggerText = style({
  [`${Root.selector({ color: "danger" })} &`]: {
    ...inputDangerTextStyles,
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

const Content = styled(KSelect.Content, {
  base: {
    marginTop: 0,
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

type Option = {
  label?: string;
  value: string;
  seperator?: boolean;
};
type SelectProps = {
  size?: "sm" | "base";
  triggerClass?: string;
  name: string;
  placeholder?: string;
  options: Option[];
  error: string;
  required?: boolean | undefined;
  disabled?: boolean;
  ref: (element: HTMLSelectElement) => void;
  onInput: JSX.EventHandler<HTMLSelectElement, InputEvent>;
  onChange: JSX.EventHandler<HTMLSelectElement, Event>;
  onBlur: JSX.EventHandler<HTMLSelectElement, FocusEvent>;
};

type SingleSelect = {
  value?: string;
} & SelectProps;

export function Select(props: SingleSelect) {
  const [rootProps, selectProps] = splitProps(
    props,
    ["name", "placeholder", "options", "required", "disabled"],
    ["placeholder", "ref", "onInput", "onChange", "onBlur"]
  );
  const [getValue, setValue] = createSignal<Option>();
  createEffect(() => {
    setValue(props.options.find((option) => props.value === option.value));
  });
  return (
    <KSelect.Root<Option>
      {...rootProps}
      multiple={false}
      value={getValue()}
      onChange={setValue}
      validationState={props.error ? "invalid" : "valid"}
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
      <KSelect.HiddenSelect {...selectProps} />
      <Trigger size={props.size} disabled={props.disabled}>
        <Text
          line
          leading="normal"
          color="secondary"
          class={triggerText}
          size={props.size === "sm" ? "xs" : "sm"}
        >
          <KSelect.Value<Option>>
            {(state) => state.selectedOption()?.label}
          </KSelect.Value>
        </Text>
        <DownIcon>
          <IconChevronDown width={15} height={15} />
        </DownIcon>
      </Trigger>
      <KSelect.Portal mount={document.getElementById("styled")!}>
        <Content>
          <Listbox class={listbox} />
        </Content>
      </KSelect.Portal>
    </KSelect.Root>
  );
}

type MultiselectProps = {
  value?: string[];
} & SelectProps;
export function Multiselect(props: MultiselectProps) {
  const [rootProps, selectProps] = splitProps(
    props,
    ["name", "placeholder", "options", "required", "disabled"],
    ["placeholder", "ref", "onInput", "onChange", "onBlur"]
  );
  const [getValue, setValue] = createSignal<Option[]>();
  createEffect(() => {
    console.log("setting value", props.value, typeof props.value);
    if (!props.value) {
      setValue([]);
      return;
    }
    const next = props.value
      ?.map((item) => props.options.find((option) => item === option.value)!)
      .filter(Boolean);
    console.log({ next });
    setValue(next);
  });
  return (
    <KSelect.Root<Option>
      {...rootProps}
      multiple={true}
      value={getValue()}
      onChange={(val) => {
        console.log({ val });
        setValue(val);
      }}
      validationState={props.error ? "invalid" : "valid"}
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
      <KSelect.HiddenSelect {...selectProps} />
      <Trigger size={props.size} disabled={props.disabled}>
        <Text
          line
          leading="normal"
          color="secondary"
          class={triggerText}
          size={props.size === "sm" ? "xs" : "sm"}
        >
          <KSelect.Value<Option>>
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
      </Trigger>
      <KSelect.Portal mount={document.getElementById("styled")!}>
        <Content>
          <Listbox class={listbox} />
        </Content>
      </KSelect.Portal>
    </KSelect.Root>
  );
}
