import { createTheme, createGlobalTheme } from "@macaron-css/core";

const base = {
  brand: "13, 88%",
  white: "0, 0%",
  black: "240, 28%",
  blue: "198, 39%",
  red: "2, 84%",
};

const light_base = {
  brand: `${base.brand}, 60%`,
  white: `${base.white}, 100%`,
  black: `${base.black}, 14%`,
  blue: `${base.blue}, 51%`,
  red: `${base.red}, 55%`,
};

const light_brand = {
  d4: `${light_base.brand}, 36%`,
  d3: `${light_base.brand}, 42%`,
  d2: `${light_base.brand}, 48%`,
  d1: `${light_base.brand}, 54%`,
  l1: `${light_base.brand}, 66%`,
  l2: `${light_base.brand}, 72%`,
};

const light_black = {
  d1: `${light_base.black}, 10%`,
};

const light_red = {
  d4: `${light_base.red}, 31%`,
  d3: `${light_base.red}, 37%`,
  d2: `${light_base.red}, 43%`,
  d1: `${light_base.red}, 49%`,
  l1: `${light_base.red}, 61%`,
  l2: `${light_base.red}, 67%`,
};

const light_accent = `hsla(${light_brand.l2}, 100%)`;

const light_background = {
  base: `hsla(${light_base.white}, 100%)`,
  hover: `hsla(${light_base.black}, 4%)`,
  surface: `hsla(${light_base.black}, 3%)`,
};

const light_divider = {
  base: `hsla(${light_base.black}, 8%)`,
  surface: `hsla(${light_base.black}, 6%)`,
};
const light_text = {
  primary: {
    base: `hsla(${light_base.black}, 93%)`,
    surface: `hsla(${light_base.black}, 78%)`,
    accent: `hsla(${light_base.white}, 93%)`,
    danger: `hsla(${light_base.white}, 93%)`,
  },
  secondary: `hsla(${light_base.black}, 60%)`,
  dimmed: `hsla(${light_base.black}, 38%)`,
};

const light_link_primary = `hsla(${light_base.blue}, 100%)`;

const light_button_primary = {
  background: light_accent,
  hover: `hsla(${light_brand.l1}, 100%)`,
  active: `hsla(${light_brand.d1}, 100%)`,
  disabledOpacity: `0.6`,
  border: `hsla(${light_brand.d2}, 100%)`,
  borderHover: `hsla(${light_brand.d1}, 100%)`,
};

const light_button_secondary = {
  background: light_background.surface,
  hover: `hsla(${light_base.black}, 3%)`,
  active: `hsla(${light_base.black}, 8%)`,
  disabledOpacity: `0.6`,
  border: `hsla(${light_base.black}, 5%)`,
  borderHover: `hsla(${light_base.black}, 7%)`,
};

const light_button_danger = {
  background: `hsla(${light_base.red}, 100%)`,
  hover: `hsla(${light_red.l1}, 100%)`,
  active: `hsla(${light_red.d1}, 100%)`,
  disabledOpacity: `0.65`,
  border: `hsla(${light_red.d2}, 100%)`,
  borderHover: `hsla(${light_red.d1}, 100%)`,
};

const light_shadow_inset = {
  surface: `0 1px 0 inset hsla(${light_base.white}, 54%)`,
  accent: `0 1px 0 inset hsla(${light_brand.l2}, 80%)`,
  danger: `0 1px 0 inset hsla(${light_red.l2}, 80%)`,
};

const light_shadow_drop = {
  layer2: `0 1px 1px hsla(${light_black.d1}, 0.03),
      0 2px 2px hsla(${light_black.d1}, 0.03)`,
  layer210: `0 1px 1px hsla(${light_black.d1}, 0.1),
        0 2px 2px hsla(${light_black.d1}, 0.1)`,
  layer10: `0 1px 1px hsla(${light_black.d1}, 0.01),
    0 2px 2px hsla(${light_black.d1}, 0.01),
    0 4px 4px hsla(${light_black.d1}, 0.01),
    0 8px 8px hsla(${light_black.d1}, 0.01),
    0 10px 10px hsla(${light_black.d1}, 0.01)
    `,
};

const light_shadow_on = {
  surface2: `${light_shadow_inset.surface}, ${light_shadow_drop.layer2}`,
  accent210: ` ${light_shadow_inset.accent}, ${light_shadow_drop.layer210}`,
  danger210: ` ${light_shadow_inset.danger}, ${light_shadow_drop.layer210}`,
};

const light_shadow_button = {
  base: light_shadow_on.surface2,
  accent: light_shadow_on.accent210,
  danger: light_shadow_on.danger210,
};

export const root = createGlobalTheme(":root", {
  fonts: {
    heading: '"IBM Plex Mono", monospace',
    body: "Rubik, sans-serif",
    code: '"IBM Plex Mono", monospace',
  },
  brand: light_brand,
});

export const [lightClass, theme] = createTheme({
  color: {
    light: {
      accent: light_accent,
      base: light_base,
      brand: light_brand,
      black: light_black,
      red: light_red,
      background: light_background,
      divider: light_divider,
      text: light_text,
      link: {
        primary: light_link_primary,
      },
      button: {
        primary: light_button_primary,
        secondary: light_button_secondary,
        danger: light_button_danger,
      },
      shadow: {
        inset: light_shadow_inset,
        drop: light_shadow_drop,
        on: light_shadow_on,
        button: light_shadow_button,
      },
    },
    dark: {
      brand: {},
      black: {},
      red: {},
    },
  },
  fonts: {
    ...root.fonts,
  },
  space: {
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
  },
});

export const darkClass = createTheme(theme, {
  ...theme,
});
