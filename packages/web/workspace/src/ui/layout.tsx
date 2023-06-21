import { styled } from "@macaron-css/solid";
import { theme } from "./theme";

export const Stack = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
  },
  variants: {
    space: (() => {
      const result = {} as Record<`${keyof (typeof theme)["space"]}`, any>;
      for (const key in theme.space) {
        const value = theme.space[key as keyof typeof theme.space];
        result[key as keyof typeof theme.space] = {
          gap: value,
        };
      }
      return result;
    })(),
    horizontal: {
      center: {
        alignItems: "center",
      },
      start: {
        alignItems: "flex-start",
      },
      end: {
        alignItems: "flex-end",
      },
    },
    vertical: {
      center: {
        justifyContent: "center",
      },
      start: {
        justifyContent: "flex-start",
      },
      end: {
        justifyContent: "flex-end",
      },
    },
  },
});

export const Row = styled("div", {
  base: {
    display: "flex",
    // For overflow hidden
    // https://dfmcphee.com/flex-items-and-min-width-0/
    minWidth: 0,
  },
  variants: {
    space: (() => {
      const result = {} as Record<`${keyof (typeof theme)["space"]}`, any>;
      for (const key in theme.space) {
        const value = theme.space[key as keyof typeof theme.space];
        result[key as keyof typeof theme.space] = {
          gap: value,
        };
      }
      return result;
    })(),
    shrink: {
      true: {
        flex: 1,
      },
      false: {
        flex: "none",
      },
    },
    vertical: {
      center: {
        alignItems: "center",
      },
      start: {
        alignItems: "flex-start",
      },
      end: {
        alignItems: "flex-end",
      },
    },
    horizontal: {
      center: {
        justifyContent: "center",
      },
      start: {
        justifyContent: "flex-start",
      },
      end: {
        justifyContent: "flex-end",
      },
    },
  },
});

export const Grower = styled("div", {
  base: {
    flexGrow: 1,
    minWidth: 0,
  },
});
