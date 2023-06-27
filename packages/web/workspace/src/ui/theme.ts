import { createTheme } from "@macaron-css/core";

const font = {
  lineHeight: "1.6",
  family: {
    heading: '"IBM Plex Mono", monospace',
    body: "Rubik, sans-serif",
    code: '"IBM Plex Mono", monospace',
  },
  size: {
    mono_xs: "0.6875rem",
    xs: "0.75rem",
    mono_sm: "0.8125rem",
    sm: "0.875rem",
    mono_base: "0.9375rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
    "6xl": "3.75rem",
    "7xl": "4.5rem",
    "8xl": "6rem",
    "9xl": "8rem",
  },
};

const constants = {
  colorFadeDuration: "0.20s",
  borderRadius: "4px",
  textBoldWeight: "600",
  iconOpacity: "0.85",
};

const space = {
  px: "1px",
  0: "0px",
  0.5: "0.125rem",
  1: "0.25rem",
  1.5: "0.375rem",
  2: "0.5rem",
  2.5: "0.625rem",
  3: "0.75rem",
  3.5: "0.875rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  7: "1.75rem",
  8: "2rem",
  9: "2.25rem",
  10: "2.5rem",
  11: "2.75rem",
  12: "3rem",
  14: "3.5rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
  28: "7rem",
  32: "8rem",
  36: "9rem",
  40: "10rem",
  44: "11rem",
  48: "12rem",
  52: "13rem",
  56: "14rem",
  60: "15rem",
  64: "16rem",
  72: "18rem",
  80: "20rem",
  96: "24rem",
};

const color = {
  base: {
    brand: "13, 88%",
    white: "0, 0%",
    black: "240, 28%",
    blue: "198, 39%",
    red: "2, 84%",
  },
};

const light = {
  accent: "",
  base: {
    brand: "",
    white: "",
    black: "",
    blue: "",
    red: "",
    gray: "",
  },
  brand: {
    d4: "",
    d3: "",
    d2: "",
    d1: "",
    l1: "",
    l2: "",
  },
  blue: {
    d1: "",
  },
  black: {
    d1: "",
  },
  red: {
    d4: "",
    d3: "",
    d2: "",
    d1: "",
    l1: "",
    l2: "",
  },
  background: {
    base: "",
    hover: "",
    surface: "",
    modal: "",
    overlay: "",
    navbar: "",
  },
  divider: {
    base: ``,
    surface: ``,
  },
  text: {
    primary: {
      base: "",
      surface: "",
      accent: "",
      danger: "",
    },
    secondary: "",
    dimmed: "",
  },
  icon: {
    primary: "",
    secondary: "",
    dimmed: "",
  },
  link: {
    primary: {
      base: "",
      hover: "",
    },
  },
  input: {
    border: "",
    shadow: "",
    background: "",
  },
  button: {
    primary: {
      color: "",
      active: "",
      border: "",
      hover: {
        color: "",
        border: "",
      },
      disabled: {
        opacity: "",
      },
    },
    secondary: {
      color: "",
      active: "",
      border: "",
      hover: {
        color: "",
        border: "",
      },
      disabled: {
        opacity: "",
      },
    },
    danger: {
      color: "",
      active: "",
      border: "",
      hover: {
        color: "",
        border: "",
      },
      disabled: {
        opacity: "",
      },
    },
  },
  tag: {
    info: {
      color: "",
      text: "",
    },
    danger: {
      color: "",
      text: "",
    },
  },
  shadow: {
    inset: {
      surface: "",
      accent: "",
      danger: "",
    },
    drop: {
      short: "",
      shortDark: "",
      medium: "",
      long: "",
    },
    on: {
      surface2: "",
      accent210: "",
      danger210: "",
    },
    button: {
      base: "",
      accent: "",
      danger: "",
    },
  },
};

const dark: typeof light = JSON.parse(JSON.stringify(light));

light.base = {
  brand: `${color.base.brand}, 60%`,
  white: `${color.base.white}, 100%`,
  black: `${color.base.black}, 14%`,
  blue: `${color.base.blue}, 51%`,
  red: `${color.base.red}, 55%`,
  gray: `${color.base.white}, 97%`,
};

light.brand = {
  d4: `${color.base.brand}, 36%`,
  d3: `${color.base.brand}, 42%`,
  d2: `${color.base.brand}, 48%`,
  d1: `${color.base.brand}, 54%`,
  l1: `${color.base.brand}, 66%`,
  l2: `${color.base.brand}, 72%`,
};

light.blue = {
  d1: `${color.base.blue}, 46%`,
};

light.black = {
  d1: `${color.base.black}, 10%`,
};

light.red = {
  d4: `${color.base.red}, 31%`,
  d3: `${color.base.red}, 37%`,
  d2: `${color.base.red}, 43%`,
  d1: `${color.base.red}, 49%`,
  l1: `${color.base.red}, 61%`,
  l2: `${color.base.red}, 67%`,
};

light.accent = `hsla(${light.base.brand}, 100%)`;

light.background = {
  base: `hsla(${light.base.white}, 100%)`,
  hover: `hsla(${light.base.black}, 4%)`,
  surface: `hsla(${light.base.black}, 3%)`,
  modal: `hsla(${light.base.gray}, 80%)`,
  overlay: `hsla(${light.base.black}, 3%)`,
  navbar: `hsla(${light.base.white}, 80%)`,
};
light.divider = {
  base: `hsla(${light.base.black}, 8%)`,
  surface: `hsla(${light.base.black}, 6%)`,
};
light.text = {
  primary: {
    base: `hsla(${light.base.black}, 93%)`,
    surface: `hsla(${light.base.black}, 78%)`,
    accent: `hsla(${light.base.white}, 93%)`,
    danger: `hsla(${light.base.white}, 93%)`,
  },
  secondary: `hsla(${light.base.black}, 60%)`,
  dimmed: `hsla(${light.base.black}, 38%)`,
};

light.icon = {
  primary: `hsla(${light.base.black}, 91%)`,
  secondary: `hsla(${light.base.black}, 51%)`,
  dimmed: `hsla(${light.base.black}, 32%)`,
};

light.link.primary = {
  base: `hsla(${light.base.blue}, 100%)`,
  hover: `hsla(${light.blue.d1}, 100%)`,
};

light.input = {
  border: `hsla(${light.base.black}, 14%)`,
  shadow: `0 1px 2px hsla(${light.black.d1}, 0.02)`,
  background: "transparent",
};

light.button.primary = {
  color: light.accent,
  active: `hsla(${light.brand.d1}, 100%)`,
  border: `hsla(${light.brand.d2}, 100%)`,
  hover: {
    color: `hsla(${light.brand.l1}, 100%)`,
    border: `hsla(${light.brand.d1}, 100%)`,
  },
  disabled: {
    opacity: "0.65",
  },
};

light.button.secondary = {
  color: light.background.surface,
  active: `hsla(${light.base.black}, 8%)`,
  border: `hsla(${light.base.black}, 5%)`,
  hover: {
    color: `hsla(${light.base.black}, 3%)`,
    border: `hsla(${light.base.black}, 5%)`,
  },
  disabled: {
    opacity: "0.6",
  },
};

light.button.danger = {
  color: `hsla(${light.base.red}, 100%)`,
  active: `hsla(${light.red.d1}, 100%)`,
  border: `hsla(${light.red.d2}, 100%)`,
  hover: {
    color: `hsla(${light.red.l1}, 100%)`,
    border: `hsla(${light.red.d1}, 100%)`,
  },
  disabled: {
    opacity: "0.65",
  },
};

light.tag.info = {
  color: light.background.surface,
  text: light.text.dimmed,
};

light.tag.danger = {
  color: `hsla(${light.base.red}, 25%)`,
  text: `hsla(${light.red.l2}, 100%)`,
};

light.shadow.inset = {
  surface: `0 1px 0 inset hsla(${light.base.white}, 54%)`,
  accent: `0 1px 0 inset hsla(${light.brand.l2}, 80%)`,
  danger: `0 1px 0 inset hsla(${light.red.l2}, 80%)`,
};

light.shadow.drop = {
  short: `0 1px 1px hsla(${light.black.d1}, 0.03),
      0 2px 2px hsla(${light.black.d1}, 0.03)`,
  shortDark: `0 1px 1px hsla(${light.black.d1}, 0.1),
        0 2px 2px hsla(${light.black.d1}, 0.1)`,
  medium: `0 1px 1px hsla(${light.black.d1}, 0.01),
    0 2px 2px hsla(${light.black.d1}, 0.01),
    0 4px 4px hsla(${light.black.d1}, 0.01),
    0 8px 8px hsla(${light.black.d1}, 0.01),
    0 10px 10px hsla(${light.black.d1}, 0.01)
    `,
  long: `
    0 2px 4px hsla(${light.black.d1}, 0.05),
    0 4px 8px hsla(${light.black.d1}, 0.05),
    0 8px 16px hsla(${light.black.d1}, 0.07),
    0 16px 32px hsla(${light.black.d1}, 0.07),
    0 32px 64px hsla(${light.black.d1}, 0.07),
    0 48px 96px hsla(${light.black.d1}, 0.07)
  `,
};

light.shadow.on = {
  surface2: `${light.shadow.inset.surface}, ${light.shadow.drop.short}`,
  accent210: ` ${light.shadow.inset.accent}, ${light.shadow.drop.shortDark}`,
  danger210: ` ${light.shadow.inset.danger}, ${light.shadow.drop.shortDark}`,
};

light.shadow.button = {
  base: light.shadow.on.surface2,
  accent: light.shadow.on.accent210,
  danger: light.shadow.on.danger210,
};

dark.base = {
  brand: `${color.base.brand}, 62%`,
  white: `${color.base.white}, 100%`,
  black: `${color.base.black}, 14%`,
  blue: `${color.base.blue}, 61%`,
  red: `${color.base.red}, 60%`,
  gray: `240, 19%, 18%`,
};

dark.brand = {
  d4: `${color.base.brand}, 38%`,
  d3: `${color.base.brand}, 44%`,
  d2: `${color.base.brand}, 50%`,
  d1: `${color.base.brand}, 56%`,
  l1: `${color.base.brand}, 71%`,
  l2: `${color.base.brand}, 77%`,
};

dark.blue = {
  d1: `${color.base.blue}, 55%`,
};

dark.black = {
  d1: `${color.base.black}, 10%`,
};

dark.red = {
  d4: `${color.base.red}, 36%`,
  d3: `${color.base.red}, 42%`,
  d2: `${color.base.red}, 48%`,
  d1: `${color.base.red}, 54%`,
  l1: `${color.base.red}, 68%`,
  l2: `${color.base.red}, 74%`,
};

dark.accent = `hsla(${dark.base.brand}, 100%)`;

dark.background = {
  base: `hsla(${dark.base.black}, 100%)`,
  hover: `hsla(${dark.base.white}, 4%)`,
  surface: `hsla(${dark.base.white}, 5%)`,
  modal: `hsla(${dark.base.gray}, 90%)`,
  overlay: `hsla(${dark.base.black}, 50%)`,
  navbar: `hsla(${light.base.black}, 75%)`,
};

dark.divider = {
  base: `hsla(${dark.base.white}, 6%)`,
  surface: `hsla(${dark.base.white}, 8%)`,
};

dark.text = {
  primary: {
    base: `hsla(${dark.base.white}, 87%)`,
    surface: `hsla(${dark.base.white}, 80%)`,
    accent: `hsla(${dark.base.white}, 87%)`,
    danger: `hsla(${dark.base.white}, 87%)`,
  },
  secondary: `hsla(${dark.base.white}, 60%)`,
  dimmed: `hsla(${dark.base.white}, 38%)`,
};

dark.icon = {
  primary: `hsla(${dark.base.white}, 74%)`,
  secondary: `hsla(${dark.base.white}, 51%)`,
  dimmed: `hsla(${dark.base.white}, 32%)`,
};

dark.link.primary = {
  base: `hsla(${dark.base.blue}, 100%)`,
  hover: `hsla(${dark.blue.d1}, 100%)`,
};

dark.input = {
  border: `hsla(${dark.base.white}, 12%)`,
  shadow: `0 1px 2px hsla(${light.black.d1}, 0.2)`,
  background: `hsla(${dark.base.white}, 4%)`,
};

dark.button.primary = {
  color: dark.accent,
  active: `hsla(${dark.brand.d1}, 100%)`,
  border: `hsla(${dark.brand.d2}, 100%)`,
  hover: {
    color: `hsla(${dark.brand.l1}, 100%)`,
    border: `hsla(${dark.brand.d1}, 100%)`,
  },
  disabled: {
    opacity: "0.65",
  },
};

dark.button.secondary = {
  color: dark.background.surface,
  active: `hsla(${dark.base.white}, 4%)`,
  border: `hsla(${dark.base.white}, 4%)`,
  hover: {
    color: `hsla(${dark.base.white}, 9%)`,
    border: `hsla(${dark.base.white}, 3%)`,
  },
  disabled: {
    opacity: "0.6",
  },
};

dark.button.danger = {
  color: `hsla(${dark.base.red}, 100%)`,
  active: `hsla(${dark.red.d1}, 100%)`,
  border: `hsla(${dark.red.d2}, 100%)`,
  hover: {
    color: `hsla(${dark.red.l1}, 100%)`,
    border: `hsla(${dark.base.red}, 100%)`,
  },
  disabled: {
    opacity: "0.65",
  },
};

dark.tag.info = {
  color: dark.background.surface,
  text: dark.text.dimmed,
};

dark.tag.danger = {
  color: `hsla(${dark.base.red}, 25%)`,
  text: `hsla(${dark.red.l2}, 100%)`,
};

dark.shadow.drop = {
  short: `0 1px 1px hsla(${dark.black.d1}, 0.4),
    0 2px 2px hsla(${dark.black.d1}, 0.4)`,
  shortDark: `0 1px 1px hsla(${dark.black.d1}, 80%),
    0 2px 2px hsla(${dark.black.d1}, 80%)`,
  medium: `0 1px 1px hsla(${dark.black.d1}, 0.075),
    0 2px 2px hsla(${dark.black.d1}, 0.075),
    0 4px 4px hsla(${dark.black.d1}, 0.075),
    0 8px 8px hsla(${dark.black.d1}, 0.075),
    0 10px 10px hsla(${dark.black.d1}, 0.075)`,
  long: `
    0 2px 10px rgba(0, 0, 0, 0.1),
    0 8px 20px rgba(0, 0, 0, 0.1),
    0 16px 40px rgba(0, 0, 0, 0.1),
    0 32px 80px rgba(0, 0, 0, 0.15),
    0 48px 120px rgba(0, 0, 0, 0.15)
  `,
};

dark.shadow.button = {
  base: dark.shadow.drop.short,
  accent: dark.shadow.drop.shortDark,
  danger: "",
};

export const [lightClass, theme] = createTheme({
  ...constants,
  space,
  font,
  color: light,
});

export const darkClass = createTheme(theme, {
  ...theme,
  ...constants,
  space,
  font,
  color: dark,
});
