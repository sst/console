import { createTheme } from "@macaron-css/core";

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
  },
  brand: {
    d4: "",
    d3: "",
    d2: "",
    d1: "",
    l1: "",
    l2: "",
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
  },
  divider: {},
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
  link: {
    primary: "",
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
  shadow: {
    inset: {
      surface: "",
      accent: "",
      danger: "",
    },
    drop: {
      layer2: "",
      layer210: "",
      layer10: "",
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
};

light.brand = {
  d4: `${color.base.brand}, 36%`,
  d3: `${color.base.brand}, 42%`,
  d2: `${color.base.brand}, 48%`,
  d1: `${color.base.brand}, 54%`,
  l1: `${color.base.brand}, 66%`,
  l2: `${color.base.brand}, 72%`,
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

light.link.primary = `hsla(${light.base.blue}, 100%)`;

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

light.shadow.inset = {
  surface: `0 1px 0 inset hsla(${light.base.white}, 54%)`,
  accent: `0 1px 0 inset hsla(${light.brand.l2}, 80%)`,
  danger: `0 1px 0 inset hsla(${light.red.l2}, 80%)`,
};

light.shadow.drop = {
  layer2: `0 1px 1px hsla(${light.black.d1}, 0.03),
      0 2px 2px hsla(${light.black.d1}, 0.03)`,
  layer210: `0 1px 1px hsla(${light.black.d1}, 0.1),
        0 2px 2px hsla(${light.black.d1}, 0.1)`,
  layer10: `0 1px 1px hsla(${light.black.d1}, 0.01),
    0 2px 2px hsla(${light.black.d1}, 0.01),
    0 4px 4px hsla(${light.black.d1}, 0.01),
    0 8px 8px hsla(${light.black.d1}, 0.01),
    0 10px 10px hsla(${light.black.d1}, 0.01)
    `,
};

light.shadow.on = {
  surface2: `${light.shadow.inset.surface}, ${light.shadow.drop.layer2}`,
  accent210: ` ${light.shadow.inset.accent}, ${light.shadow.drop.layer210}`,
  danger210: ` ${light.shadow.inset.danger}, ${light.shadow.drop.layer210}`,
};

light.shadow.button = {
  base: light.shadow.on.surface2,
  accent: light.shadow.on.accent210,
  danger: light.shadow.on.danger210,
};

export const [lightClass, theme] = createTheme({
  color: light,
  fonts: {
    heading: '"IBM Plex Mono", monospace',
    body: "Rubik, sans-serif",
    code: '"IBM Plex Mono", monospace',
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
