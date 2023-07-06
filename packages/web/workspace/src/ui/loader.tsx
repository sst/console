import {globalKeyframes} from "@macaron-css/core";
import {styled} from "@macaron-css/solid";
import {theme} from "./theme";
import {Stack} from "./layout";
import {ParentProps} from "solid-js";
import {
  IconApi,
  IconApp,
  IconAuth,
  IconBucket,
  IconConfig,
  IconCron,
  IconEventBus,
  IconFunction,
  IconRDS,
} from "./icons/custom";

const opacity = 0.3;
const timing = "ease-out";

globalKeyframes("pulse33", {
  "0%": {
    opacity,
  },
  "16.66%": {
    opacity: 1,
  },
  "33.32%": {
    opacity,
  },
});

const LoadingResourcesH1 = styled("h1", {
  base: {
    fontSize: theme.font.size.lg,
    fontWeight: 500,
    color: theme.color.text.dimmed.base,
  },
});

const LoadingResourcesIndicator = styled("div", {
  base: {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    borderRadius: theme.borderRadius,
    border: `1px solid ${theme.color.divider.base}`,
  },
});

const LoadingRow = styled("div", {
  base: {
    display: "inline-flex",
    alignItems: "center",
    borderTop: `1px solid ${theme.color.divider.base}`,
    selectors: {
      "&:first-child": {
        borderTopWidth: 0,
      },
    },
  },
});

const LoadingIcon = styled("div", {
  base: {
    borderRight: `1px solid ${theme.color.divider.base}`,
    padding: 30,
    width: 96,
    height: 96,
    color: theme.color.icon.dimmed,
    selectors: {
      "&:last-child": {
        borderRightWidth: 0,
      },
    },
  },
});

export function Syncing(props: ParentProps) {
  return (
    <Stack space="5" horizontal="center">
      <LoadingResourcesH1>{props.children}</LoadingResourcesH1>
      <LoadingResourcesIndicator>
        <LoadingRow>
          <LoadingIcon>
            <IconApi
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} infinite`,
              }}
            />
          </LoadingIcon>
          <LoadingIcon>
            <IconAuth
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} .5s infinite`,
              }}
            />
          </LoadingIcon>
          <LoadingIcon>
            <IconConfig
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} 1s infinite`,
              }}
            />
          </LoadingIcon>
        </LoadingRow>
        <LoadingRow>
          <LoadingIcon>
            <IconFunction
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} .5s infinite`,
              }}
            />
          </LoadingIcon>
          <LoadingIcon>
            <IconApp
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} 1s infinite`,
              }}
            />
          </LoadingIcon>
          <LoadingIcon>
            <IconEventBus
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} 1.5s infinite`,
              }}
            />
          </LoadingIcon>
        </LoadingRow>
        <LoadingRow>
          <LoadingIcon>
            <IconCron
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} 1s infinite`,
              }}
            />
          </LoadingIcon>
          <LoadingIcon>
            <IconBucket
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} 1.5s infinite`,
              }}
            />
          </LoadingIcon>
          <LoadingIcon>
            <IconRDS
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} 2s infinite`,
              }}
            />
          </LoadingIcon>
        </LoadingRow>
      </LoadingResourcesIndicator>
    </Stack>
  );
}
