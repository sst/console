import { Select as KSelect } from "@kobalte/core";
import { CSSProperties } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { theme } from "./theme";
import { utility } from "./utility";
import { ComponentProps, Show } from "solid-js";
import { Text } from "./text";
import { Stack } from "./layout";

export const inputStyles: CSSProperties = {
  border: "none",
  lineHeight: theme.font.lineHeight,
  appearance: "none",
  fontSize: theme.font.size.sm,
  borderRadius: theme.borderRadius,
  padding: `0 ${theme.space[3]}`,
  height: theme.input.size.base,
  backgroundColor: theme.color.input.background,
  // transition: `box-shadow ${theme.colorFadeDuration}`,
  boxShadow: `
    0 0 0 1px inset ${theme.color.input.border},
    ${theme.color.input.shadow}
  `,
};

export const inputDisabledStyles: CSSProperties = {
  opacity: 0.5,
  backgroundColor: theme.color.background.surface,
  color: theme.color.text.dimmed.base,
  cursor: "default",
  boxShadow: `0 0 0 1px inset ${theme.color.input.border}`,
};

export const inputFocusStyles: CSSProperties = {
  boxShadow: `
    0 0 1px 1px inset hsla(${theme.color.blue.d1}, 100%),
    ${theme.color.input.shadow}
  `,
};

export const inputDangerFocusStyles: CSSProperties = {
  color: `hsla(${theme.color.red.d2}, 100%)`,
  boxShadow: `
    0 0 1px 1px inset hsla(${theme.color.red.l2}, 100%),
    ${theme.color.input.shadow}
  `,
};

const Input = styled("input", {
  base: {
    ...inputStyles,
    ":focus": {
      ...inputFocusStyles,
    },
    ":disabled": {
      ...inputDisabledStyles,
    },
  },
  variants: {
    color: {
      primary: {},
      danger: {
        ...inputDangerFocusStyles,
        ":focus": {
          ...inputDangerFocusStyles,
        },
      },
    },
  },
  defaultVariants: {
    color: "primary",
  },
});

export const Textarea = styled("textarea", {
  base: {
    ...inputStyles,
    height: "auto",
    padding: `${theme.space[2]} ${theme.space[3]}`,
    ":focus": {
      ...inputFocusStyles,
    },
    ":disabled": {
      ...inputDisabledStyles,
    },
  },
  variants: {
    color: {
      primary: {},
      danger: {
        ...inputDangerFocusStyles,
        ":focus": {
          ...inputDangerFocusStyles,
        },
      },
    },
  },
  defaultVariants: {
    color: "primary",
  },
});

const chevronDownString = `
  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'>
    <path stroke='#767681' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/>
  </svg>
`;

export const Select = styled("select", {
  base: {
    ...inputStyles,
    backgroundRepeat: "no-repeat",
    backgroundSize: "1.25rem 1.25rem",
    backgroundPosition: "bottom 50% right 0.5rem",
    backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
      chevronDownString
    )}")`,
    paddingRight: theme.space[10],
    ":focus": {
      ...inputFocusStyles,
    },
    ":invalid": {
      color: theme.color.text.dimmed.base,
    },
    ":disabled": {
      ...inputDisabledStyles,
    },
  },
  variants: {
    color: {
      primary: {},
      danger: {
        ...inputDangerFocusStyles,
        ":focus": {
          ...inputDangerFocusStyles,
        },
      },
    },
  },
  defaultVariants: {
    color: "primary",
  },
});

const Label = styled("p", {
  base: {
    fontWeight: 500,
    letterSpacing: 0.5,
    fontSize: theme.font.size.mono_sm,
    textTransform: "uppercase",
    fontFamily: theme.font.family.heading,
  },
});

const Hint = styled("p", {
  base: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.dimmed.base,
  },
  variants: {
    color: {
      primary: {},
      danger: {
        color: `hsla(${theme.color.red.l2}, 100%)`,
      },
    },
  },
  defaultVariants: {
    color: "primary",
  },
});

const Root = styled("label", {
  base: {
    ...utility.stack(2.5),
  },
});

type InputProps = ComponentProps<typeof Input> & {
  hint?: string;
  label?: string;
};

export function FormInput(props: InputProps) {
  return (
    <Root>
      <Stack space="3">
        <Show when={props.label}>
          <Label color={props.color}>{props.label}</Label>
        </Show>
        <Input {...props} />
      </Stack>
      <Show when={props.hint}>
        <Hint color={props.color}>{props.hint}</Hint>
      </Show>
    </Root>
  );
}

type TextareaProps = ComponentProps<typeof Textarea> & {
  hint?: string;
  label?: string;
};

export function FormTextArea(props: TextareaProps) {
  return (
    <Root>
      <Stack space="3">
        <Show when={props.label}>
          <Label color={props.color}>{props.label}</Label>
        </Show>
        <Textarea {...props} />
      </Stack>
      <Show when={props.hint}>
        <Hint color={props.color}>{props.hint}</Hint>
      </Show>
    </Root>
  );
}

type SelectProps = ComponentProps<typeof Select> & {
  hint?: string;
  label?: string;
};

export function FormSelect(props: SelectProps) {
  return (
    <Root>
      <Stack space="3">
        <Show when={props.label}>
          <Label color={props.color}>{props.label}</Label>
        </Show>
        <Select {...props}>{props.children}</Select>
      </Stack>
      <Show when={props.hint}>
        <Hint color={props.color}>{props.hint}</Hint>
      </Show>
    </Root>
  );
}

const SplitOptionsRoot = styled("div", {
  base: {
    ...inputStyles,
    ...utility.row(0),
    padding: 1,
  },
  variants: {
    size: {
      base: {
        height: theme.input.size.base,
      },
      sm: {
        height: theme.input.size.sm,
      },
    },
  },
  defaultVariants: {
    size: "base",
  },
});

const SplitOptionsOptionRoot = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    padding: inputStyles.padding,
    borderRight: `1px solid ${theme.color.input.border}`,
    ":last-child": {
      borderRight: "none",
    },
  },
  variants: {
    selected: {
      true: {
        backgroundColor: theme.color.background.surface,
        color: theme.color.text.primary.surface,
      },
      false: {},
    },
  },
  defaultVariants: {
    selected: false,
  },
});

const SplitOptionsOptionText = styled("span", {
  base: {
    selectors: {
      [`${SplitOptionsOptionRoot.selector({ selected: true })} &`]: {
        color: theme.color.text.primary.surface,
      },
      [`${SplitOptionsOptionRoot.selector({ selected: false })} &`]: {
        color: theme.color.text.secondary.base,
      },
      [`${SplitOptionsRoot.selector({ size: "base" })} &`]: {
        fontSize: theme.font.size.sm,
      },
      [`${SplitOptionsRoot.selector({ size: "sm" })} &`]: {
        fontSize: theme.font.size.xs,
      },
    },
  },
});

type SplitOptionsOptionProps = ComponentProps<
  typeof SplitOptionsOptionRoot
> & {};

export function SplitOptionsOption(props: SplitOptionsOptionProps) {
  return (
    <SplitOptionsOptionRoot {...props}>
      <SplitOptionsOptionText>{props.children}</SplitOptionsOptionText>
    </SplitOptionsOptionRoot>
  );
}

type SplitOptionsProps = ComponentProps<typeof SplitOptionsRoot> & {};

export function SplitOptions(props: SplitOptionsProps) {
  return <SplitOptionsRoot {...props}>{props.children}</SplitOptionsRoot>;
}

//function NewSelect() {
//  return (
//    <KSelect.Root
//      options={["Apple"]}
//      placeholder="Select a fruit…"
//    ></KSelect.Root>
//  );
//}
