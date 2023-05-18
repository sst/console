import { createTheme, createGlobalTheme } from "@macaron-css/core";

const color = {
  base: {
    brand: "13, 88%",
    white: "0, 0%",
    black: "240, 28%",
    blue: "198, 39%",
    red: "2, 84%",
  },
  light: {
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
      primary: {},
      secondary: "",
      dimmed: "",
    },
    link: {
      primary: "",
    },
    button: {
      primary: {},
      secondary: {},
      danger: {},
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
      button: {},
    },
  },
  dark: {
    brand: {},
    black: {},
    red: {},
  },
};

color.light.base = {
  brand: `${color.base.brand}, 60%`,
  white: `${color.base.white}, 100%`,
  black: `${color.base.black}, 14%`,
  blue: `${color.base.blue}, 51%`,
  red: `${color.base.red}, 55%`,
};

color.light.brand = {
  d4: `${color.light.base.brand}, 36%`,
  d3: `${color.light.base.brand}, 42%`,
  d2: `${color.light.base.brand}, 48%`,
  d1: `${color.light.base.brand}, 54%`,
  l1: `${color.light.base.brand}, 66%`,
  l2: `${color.light.base.brand}, 72%`,
};

color.light.black = {
  d1: `${color.light.base.black}, 10%`,
};

color.light.red = {
  d4: `${color.light.base.red}, 31%`,
  d3: `${color.light.base.red}, 37%`,
  d2: `${color.light.base.red}, 43%`,
  d1: `${color.light.base.red}, 49%`,
  l1: `${color.light.base.red}, 61%`,
  l2: `${color.light.base.red}, 67%`,
};

color.light.accent = `hsla(${color.light.brand}, 100%)`;
color.light.background = {
  base: `hsla(${color.light.base.white}, 100%)`,
  hover: `hsla(${color.light.base.black}, 4%)`,
  surface: `hsla(${color.light.base.black}, 3%)`,
};
color.light.divider = {
  base: `hsla(${color.light.base.black}, 8%)`,
  surface: `hsla(${color.light.base.black}, 6%)`,
};
color.light.text = {
  primary: {
    base: `hsla(${color.light.base.black}, 93%)`,
    surface: `hsla(${color.light.base.black}, 78%)`,
    accent: `hsla(${color.light.base.white}, 93%)`,
    danger: `hsla(${color.light.base.white}, 93%)`,
  },
  secondary: `hsla(${color.light.base.black}, 60%)`,
  dimmed: `hsla(${color.light.base.black}, 38%)`,
};

color.light.link.primary = `hsla(${color.light.base.blue}, 100%)`;

color.light.button.primary = {
  background: color.light.accent,
  hover: `hsla(${color.light.brand.l1}, 100%)`,
  active: `hsla(${color.light.brand.d1}, 100%)`,
  disabledOpacity: 0.65,
  border: `hsla(${color.light.brand.d2}, 100%)`,
  borderHover: `hsla(${color.light.brand.d1}, 100%)`,
};

color.light.button.secondary = {
  background: color.light.background.surface,
  hover: `hsla(${color.light.base.black}, 3%)`,
  active: `hsla(${color.light.base.black}, 8%)`,
  disabledOpacity: 0.6,
  border: `hsla(${color.light.base.black}, 5%)`,
  borderHover: `hsla(${color.light.base.black}, 7%)`,
};

color.light.button.danger = {
  background: `hsla(${color.light.base.red}, 100%)`,
  hover: `hsla(${color.light.red.l1}, 100%)`,
  active: `hsla(${color.light.red.d1}, 100%)`,
  disabledOpacity: 0.65,
  border: `hsla(${color.light.red.d2}, 100%)`,
  borderHover: `hsla(${color.light.red.d1}, 100%)`,
};

color.light.shadow.inset = {
  surface: `0 1px 0 inset hsla(${color.light.base.white}, 54%)`,
  accent: `0 1px 0 inset hsla(${color.light.brand.l2}, 80%)`,
  danger: `0 1px 0 inset hsla(${color.light.red.l2}, 80%)`,
};

color.light.shadow.drop = {
  layer2: `0 1px 1px hsla(${color.light.black.d1}, 0.03),
      0 2px 2px hsla(${color.light.black.d1}, 0.03)`,
  layer210: `0 1px 1px hsla(${color.light.black.d1}, 0.1),
        0 2px 2px hsla(${color.light.black.d1}, 0.1)`,
  layer10: `0 1px 1px hsla(${color.light.black.d1}, 0.01),
    0 2px 2px hsla(${color.light.black.d1}, 0.01),
    0 4px 4px hsla(${color.light.black.d1}, 0.01),
    0 8px 8px hsla(${color.light.black.d1}, 0.01),
    0 10px 10px hsla(${color.light.black.d1}, 0.01)
    `,
};

color.light.shadow.on = {
  surface2: `${color.light.shadow.inset.surface}, ${color.light.shadow.drop.layer2}`,
  accent210: ` ${color.light.shadow.inset.accent}, ${color.light.shadow.drop.layer210}`,
  danger210: ` ${color.light.shadow.inset.danger}, ${color.light.shadow.drop.layer210}`,
};

color.light.shadow.button = {
  base: color.light.shadow.on.surface2,
  accent: color.light.shadow.on.accent210,
  danger: color.light.shadow.on.danger210,
};

export const root = createGlobalTheme(":root", {
  fonts: {
    heading: '"IBM Plex Mono", monospace',
    body: "Rubik, sans-serif",
    code: '"IBM Plex Mono", monospace',
  },
  brand: color.light.brand,
});

export const [lightClass, theme] = createTheme({
  color: {
    danger: {
      border: "hsl(2deg 84% 43%)",
      surface: "hsl(2deg 84% 55%)",
      foreground: "hsl(0deg 0% 100% / 93%)",
      shadow:
        "hsl(2.11deg 84.52% 67.06% / 80%) 0px 1px 0px 0px inset, hsl(240deg 29.41% 10% / 10%) 0px 1px 1px 0px, hsl(240deg 29.41% 10% / 10%) 0px 2px 2px 0px",
      hover: {
        surface: "hsl(2deg 84% 61%)",
        border: "hsl(2deg 84% 49%)",
      },
      active: {
        surface: "hsl(2deg 84% 49%)",
        border: "transparent",
      },
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
