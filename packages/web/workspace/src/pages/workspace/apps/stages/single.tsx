import sst from "./sst.png";
import patrick from "./patrick.jpg";
import { styled } from "@macaron-css/solid";
import { globalStyle } from "@macaron-css/core";
import { Button } from "../../../../ui/button";
import { theme } from "../../../../ui/theme";
import { createSubscription } from "../../../../data/replicache";
import { useParams } from "@solidjs/router";
import { StageStore } from "../../../../data/stage";
import { AppStore } from "../../../../data/app";

const Root = styled("div", {
  base: {
    position: "fixed",
    inset: 0,
  },
});

const Content = styled("div", {
  base: {
    padding: theme.contentPadding,
  },
});

const Navbar = styled("div", {
  base: {
    top: "0",
    position: "sticky",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    zIndex: "10",
    borderBottom: `1px solid ${theme.color.divider.base}`,
    padding: theme.navbarPadding,
  },
});

const User = styled("a", {
  base: {
    color: theme.color.text.secondary,
    cursor: "pointer",
    fontSize: "0.875rem",
    opacity: "0.8",
    transition: `opacity ${theme.colorFadeDuration} ease-out`,
    ":hover": {
      opacity: "1",
      textDecoration: "none",
    },
  },
});

const UserImage = styled("img", {
  base: {
    marginRight: "3px",
    borderRadius: "50%",
    verticalAlign: "middle",
    backgroundColor: theme.color.background.surface,
  },
});

const Switcher = styled("div", {
  base: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
  },
});

globalStyle(`${Switcher} > button`, {
  flex: "0 0 auto",
  padding: `0 ${theme.navbarPadding} 0 0`,
  border: "none",
  borderRadius: "4px",
  backgroundColor: "transparent",
  transition: `border ${theme.colorFadeDuration} ease-out`,
});

globalStyle(`${Switcher} > button > img`, {
  display: "block",
  borderRadius: theme.borderRadius,
});

globalStyle(`${Switcher} > div`, {
  flex: "1 1 auto",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `0 0 0 ${theme.navbarPadding}`,
  borderLeft: `1px solid ${theme.color.divider.base}`,
});

globalStyle(`${Switcher} div.breadcrumb`, {
  marginRight: "7px",
});

globalStyle(`${Switcher} div.breadcrumb > div`, {
  font: theme.fonts.heading,
  color: theme.color.text.secondary,
});

globalStyle(`${Switcher} div.breadcrumb > div:first-child`, {
  fontWeight: "500",
});

globalStyle(`${Switcher} div.breadcrumb > div:last-child`, {
  marginTop: "5px",
  fontSize: "0.875rem",
  color: theme.color.text.dimmed,
});

const SwitcherIcon = styled("span", {
  base: {
    padding: "5px 0",
    borderRadius: "10px",
    opacity: "0.7",
    color: theme.color.text.dimmed,
    transition: `
      color ${theme.colorFadeDuration} ease-out,
      background-color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${Switcher} > div:hover > &`]: {
        color: theme.color.text.secondary,
      },
      [`${Switcher} > div:active > &`]: {
        backgroundColor: theme.color.button.secondary.active,
      },
    },
  },
});

globalStyle(`${SwitcherIcon} svg`, {
  display: "block",
  width: "20px",
  height: "20px",
  color: theme.color.base.black,
});

const Resource = styled("div", {
  base: {
    marginBottom: theme.space[4],
    borderRadius: theme.borderRadius,
    backgroundColor: theme.color.background.surface,
  },
  variants: {
    type: {
      default: {},
      outputs: {
        backgroundColor: "transparent",
        border: `1px solid ${theme.color.divider.base}`,
      },
    },
  },
});

globalStyle(`${Resource} > div.title`, {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `calc(${theme.space[4]} - 2px) calc(${theme.space[4]} + 4px)`,
  borderBottom: `1px solid ${theme.color.divider.surface}`,
});

globalStyle(`${Resource} > div.title h1`, {
  display: "flex",
  alignItems: "baseline",
});

globalStyle(`${Resource} > div.title span`, {
  fontWeight: "500",
  fontFamily: theme.fonts.body,
  fontSize: "0.875rem",
});

globalStyle(`${Resource} > div.title svg`, {
  marginRight: "5px",
  padding: "1px 0",
  width: "16px",
  height: "16px",
  alignSelf: "center",
  opacity: theme.iconOpacity,
});

globalStyle(`${Resource} > div.title span.desc`, {
  marginLeft: "8px",
  fontWeight: "400",
  fontSize: "0.8125rem",
  color: theme.color.text.secondary,
});

globalStyle(`${Resource} > div.title h6`, {
  fontSize: "0.8125rem",
  fontWeight: "400",
  textTransform: "none",
  color: theme.color.text.secondary,
});

globalStyle(`${Resource} > ul`, {
  margin: "0",
  padding: "0",
  listStyleType: "none",
});

const Item = styled("li", {
  base: {
    margin: `0 calc(${theme.space[4]} + 4px)`,
    padding: "13px 0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: `1px solid ${theme.color.divider.surface}`,
    selectors: {
      "&:last-child": {
        border: "none",
      },
    },
  },
});

globalStyle(`${Item} > .left, ${Item} > .right`, {
  display: "flex",
  alignItems: "center",
});

globalStyle(`${Item} > .right span`, {
  marginLeft: `calc(${theme.space[4]} / 1.5)`,
});

globalStyle(`${Item} .name`, {
  marginRight: theme.space[4],
  fontSize: "0.875rem",
});

globalStyle(`${Item} .method`, {
  margin: "0 10px 0 0",
  width: "50px",
  textAlign: "center",
  color: theme.color.text.secondary,
  fontSize: "0.5625rem",
  textTransform: "uppercase",
  border: `1px solid ${theme.color.divider.base}`,
  padding: "4px 4px",
  borderRadius: theme.borderRadius,
});

globalStyle(`${Item} .route`, {
  fontFamily: theme.fonts.code,
  fontSize: "0.875rem",
});

globalStyle(`${Item} .size`, {
  color: theme.color.text.secondary,
  fontSize: "0.8125rem",
  fontFamily: theme.fonts.code,
});

globalStyle(`${Item} .runtime svg`, {
  marginLeft: "10px",
  width: "16px",
  height: "16px",
  color: theme.color.text.dimmed,
  opacity: theme.iconOpacity,
  verticalAlign: "middle",
});

globalStyle(`${Item} .region`, {
  marginLeft: "7px",
  color: theme.color.text.dimmed,
  fontSize: "0.625rem",
  textTransform: "uppercase",
  fontFamily: theme.fonts.code,
});

globalStyle(`${Item} .value`, {
  color: theme.color.text.secondary,
  fontFamily: theme.fonts.code,
  fontSize: "0.8125rem",
});

const CopyButton = styled("a", {
  base: {
    marginLeft: "10px",
    color: theme.color.text.dimmed,
    opacity: theme.iconOpacity,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      "&:hover": {
        color: theme.color.text.secondary,
      },
    },
  },
});

globalStyle(`${CopyButton} svg`, {
  display: "block",
  width: "18px",
  height: "18px",
});

export function Single() {
  const params = useParams();
  const stage = createSubscription(() => StageStore.fromID(params.stageID));
  const app = createSubscription(() => AppStore.fromID(params.appID));
  return (
    <Root>
      <Navbar>
        <Switcher>
          <button>
            <img width="32px" src={sst} />
          </button>
          <div>
            <div class="breadcrumb">
              <div>{app()?.name}</div>
              <div>{stage()?.name}</div>
            </div>
            <SwitcherIcon>
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fill-rule="evenodd"
                  d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z"
                  clip-rule="evenodd"
                ></path>
              </svg>
            </SwitcherIcon>
          </div>
        </Switcher>
        <User>
          <UserImage width="28px" src={patrick} />
        </User>
      </Navbar>
      <Content>
        <div>
          test
          <Button color="danger">Delete</Button>
          <Button color="primary">Enable</Button>
          <Button color="secondary">Settings</Button>
          <Button disabled color="danger">
            Delete
          </Button>
          <Button disabled color="primary">
            Enable
          </Button>
          <Button disabled color="secondary">
            Settings
          </Button>
        </div>
        <Resource>
          <div class="title">
            <h1>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <g fill="none">
                  <g clip-path="url(#akarIconsNextjsFill0)">
                    <path
                      fill="currentColor"
                      d="M11.214.006c-.052.005-.216.022-.364.033c-3.408.308-6.6 2.147-8.624 4.974a11.88 11.88 0 0 0-2.118 5.243c-.096.66-.108.854-.108 1.748s.012 1.089.108 1.748c.652 4.507 3.86 8.293 8.209 9.696c.779.251 1.6.422 2.533.526c.364.04 1.936.04 2.3 0c1.611-.179 2.977-.578 4.323-1.265c.207-.105.247-.134.219-.157a211.64 211.64 0 0 1-1.955-2.62l-1.919-2.593l-2.404-3.559a342.499 342.499 0 0 0-2.422-3.556c-.009-.003-.018 1.578-.023 3.51c-.007 3.38-.01 3.516-.052 3.596a.426.426 0 0 1-.206.213c-.075.038-.14.045-.495.045H7.81l-.108-.068a.44.44 0 0 1-.157-.172l-.05-.105l.005-4.704l.007-4.706l.073-.092a.644.644 0 0 1 .174-.143c.096-.047.133-.051.54-.051c.478 0 .558.018.682.154c.035.038 1.337 2 2.895 4.362l4.734 7.172l1.9 2.878l.097-.063a12.318 12.318 0 0 0 2.465-2.163a11.947 11.947 0 0 0 2.825-6.135c.096-.66.108-.854.108-1.748s-.012-1.088-.108-1.748C23.24 5.75 20.032 1.963 15.683.56a12.6 12.6 0 0 0-2.498-.523c-.226-.024-1.776-.05-1.97-.03Zm4.913 7.26a.473.473 0 0 1 .237.276c.018.06.023 1.365.018 4.305l-.007 4.218l-.743-1.14l-.746-1.14v-3.066c0-1.983.009-3.097.023-3.151a.478.478 0 0 1 .232-.296c.097-.05.132-.054.5-.054c.347 0 .408.005.486.047Z"
                    />
                  </g>
                  <defs>
                    <clipPath id="akarIconsNextjsFill0">
                      <path fill="#fff" d="M0 0h24v24H0z" />
                    </clipPath>
                  </defs>
                </g>
              </svg>
              <span>site</span>
              <span class="desc">my-sst-app.com</span>
            </h1>
            <h6>NextjsSite</h6>
          </div>
          <ul>
            <Item>
              <div class="left">
                <a class="name">Server Function</a>
              </div>
              <div class="right">
                <span class="size">11.2 MB</span>
                <span title="Node.js 18.x" class="runtime">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                    <path
                      fill="currentColor"
                      d="M429.76 130.07L274.33 36.85a37 37 0 0 0-36.65 0L82.24 130.06A38.2 38.2 0 0 0 64 162.83V349a38.26 38.26 0 0 0 18.24 32.8L123 406.14l.23.13c20.58 10.53 28.46 10.53 37.59 10.53c32.14 0 52.11-20.8 52.11-54.29V182a8.51 8.51 0 0 0-8.42-8.58h-22.38a8.51 8.51 0 0 0-8.42 8.58v180.51a15 15 0 0 1-6.85 13.07c-5.9 3.6-14.47 2.84-24.14-2.15l-39.06-23.51a1.1 1.1 0 0 1-.48-.92V165.46a1.32 1.32 0 0 1 .59-1.06l151.84-93a.82.82 0 0 1 .73 0l151.93 93a1.34 1.34 0 0 1 .55 1.1V349a1.28 1.28 0 0 1-.45 1l-152.06 90.65a1.22 1.22 0 0 1-.8 0l-38.83-23.06a7.8 7.8 0 0 0-7.83-.41l-.34.2c-10.72 6.35-13.6 8-23.54 11.62c-1.62.59-5.43 2-5.76 5.77s3.29 6.45 6.51 8.32l51.9 31.87a35.67 35.67 0 0 0 18.3 5.07h.58a35.87 35.87 0 0 0 17.83-5.07l155.43-93.13A38.37 38.37 0 0 0 448 349V162.83a38.21 38.21 0 0 0-18.24-32.76Z"
                    />
                    <path
                      fill="currentColor"
                      d="M307.88 318.05c-37.29 0-45.24-10.42-47.6-27.24a8.43 8.43 0 0 0-8.22-7.32h-19.8a8.44 8.44 0 0 0-8.26 8.58c0 14.58 5.12 62.17 83.92 62.17c24.38 0 44.66-5.7 58.63-16.49S388 311.26 388 292.55c0-37.55-24.5-47.83-72.75-54.55c-49.05-6.82-49.05-10.29-49.05-17.89c0-5.47 0-18.28 35.46-18.28c25.23 0 38.74 3.19 43.06 20a8.35 8.35 0 0 0 8.06 6.67h19.87a8.24 8.24 0 0 0 6.16-2.86a8.91 8.91 0 0 0 2.12-6.44c-2.57-35.55-28.56-53.58-79.24-53.58c-46.06 0-73.55 20.75-73.55 55.5c0 38.1 28.49 48.87 71.29 53.33c50 5.17 50 12.71 50 19.37c.03 10.38-4.28 24.23-41.55 24.23Z"
                    />
                  </svg>
                </span>
                <span class="region">us-east-1</span>
              </div>
            </Item>
            <Item>
              <div class="left">
                <a class="name">Image Function</a>
              </div>
              <div class="right">
                <span class="size">34.8 MB</span>
                <span title="Python 3.10" class="runtime">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15">
                    <path
                      fill="none"
                      stroke="currentColor"
                      d="M6 2.5h1M4.5 4V1.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V11M8 4.5H1.5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h3m2.5-1h6.5a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1h-3m-2.5 9h1"
                    />
                  </svg>
                </span>
                <span class="region">us-east-1</span>
              </div>
            </Item>
          </ul>
        </Resource>
        <div>
          test
          <Button color="danger">Delete</Button>
          <Button color="primary">Enable</Button>
          <Button color="secondary">Settings</Button>
          <Button disabled color="danger">
            Delete
          </Button>
          <Button disabled color="primary">
            Enable
          </Button>
          <Button disabled color="secondary">
            Settings
          </Button>
        </div>
        <Resource>
          <div class="title">
            <h1>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 13h5m3 3V8h3a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-3m8-5v8M9 16v-5.5a2.5 2.5 0 0 0-5 0V16"
                />
              </svg>
              <span>api</span>
              <span class="desc">api.my-sst-app.com</span>
            </h1>
            <h6>Api</h6>
          </div>
          <ul>
            <Item>
              <div class="left">
                <span class="method">GET</span>
                <a class="route">/notes</a>
              </div>
              <div class="right">
                <span class="size">3.4 MB</span>
                <span title="Node.js 18.x" class="runtime">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                    <path
                      fill="currentColor"
                      d="M429.76 130.07L274.33 36.85a37 37 0 0 0-36.65 0L82.24 130.06A38.2 38.2 0 0 0 64 162.83V349a38.26 38.26 0 0 0 18.24 32.8L123 406.14l.23.13c20.58 10.53 28.46 10.53 37.59 10.53c32.14 0 52.11-20.8 52.11-54.29V182a8.51 8.51 0 0 0-8.42-8.58h-22.38a8.51 8.51 0 0 0-8.42 8.58v180.51a15 15 0 0 1-6.85 13.07c-5.9 3.6-14.47 2.84-24.14-2.15l-39.06-23.51a1.1 1.1 0 0 1-.48-.92V165.46a1.32 1.32 0 0 1 .59-1.06l151.84-93a.82.82 0 0 1 .73 0l151.93 93a1.34 1.34 0 0 1 .55 1.1V349a1.28 1.28 0 0 1-.45 1l-152.06 90.65a1.22 1.22 0 0 1-.8 0l-38.83-23.06a7.8 7.8 0 0 0-7.83-.41l-.34.2c-10.72 6.35-13.6 8-23.54 11.62c-1.62.59-5.43 2-5.76 5.77s3.29 6.45 6.51 8.32l51.9 31.87a35.67 35.67 0 0 0 18.3 5.07h.58a35.87 35.87 0 0 0 17.83-5.07l155.43-93.13A38.37 38.37 0 0 0 448 349V162.83a38.21 38.21 0 0 0-18.24-32.76Z"
                    />
                    <path
                      fill="currentColor"
                      d="M307.88 318.05c-37.29 0-45.24-10.42-47.6-27.24a8.43 8.43 0 0 0-8.22-7.32h-19.8a8.44 8.44 0 0 0-8.26 8.58c0 14.58 5.12 62.17 83.92 62.17c24.38 0 44.66-5.7 58.63-16.49S388 311.26 388 292.55c0-37.55-24.5-47.83-72.75-54.55c-49.05-6.82-49.05-10.29-49.05-17.89c0-5.47 0-18.28 35.46-18.28c25.23 0 38.74 3.19 43.06 20a8.35 8.35 0 0 0 8.06 6.67h19.87a8.24 8.24 0 0 0 6.16-2.86a8.91 8.91 0 0 0 2.12-6.44c-2.57-35.55-28.56-53.58-79.24-53.58c-46.06 0-73.55 20.75-73.55 55.5c0 38.1 28.49 48.87 71.29 53.33c50 5.17 50 12.71 50 19.37c.03 10.38-4.28 24.23-41.55 24.23Z"
                    />
                  </svg>
                </span>
                <span class="region">us-east-1</span>
              </div>
            </Item>
            <Item>
              <div class="left">
                <span class="method">OPTIONS</span>
                <a class="route">/notes/settings</a>
              </div>
              <div class="right">
                <span class="size">11.2 MB</span>
                <span title="Node.js 18.x" class="runtime">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                    <path
                      fill="currentColor"
                      d="M429.76 130.07L274.33 36.85a37 37 0 0 0-36.65 0L82.24 130.06A38.2 38.2 0 0 0 64 162.83V349a38.26 38.26 0 0 0 18.24 32.8L123 406.14l.23.13c20.58 10.53 28.46 10.53 37.59 10.53c32.14 0 52.11-20.8 52.11-54.29V182a8.51 8.51 0 0 0-8.42-8.58h-22.38a8.51 8.51 0 0 0-8.42 8.58v180.51a15 15 0 0 1-6.85 13.07c-5.9 3.6-14.47 2.84-24.14-2.15l-39.06-23.51a1.1 1.1 0 0 1-.48-.92V165.46a1.32 1.32 0 0 1 .59-1.06l151.84-93a.82.82 0 0 1 .73 0l151.93 93a1.34 1.34 0 0 1 .55 1.1V349a1.28 1.28 0 0 1-.45 1l-152.06 90.65a1.22 1.22 0 0 1-.8 0l-38.83-23.06a7.8 7.8 0 0 0-7.83-.41l-.34.2c-10.72 6.35-13.6 8-23.54 11.62c-1.62.59-5.43 2-5.76 5.77s3.29 6.45 6.51 8.32l51.9 31.87a35.67 35.67 0 0 0 18.3 5.07h.58a35.87 35.87 0 0 0 17.83-5.07l155.43-93.13A38.37 38.37 0 0 0 448 349V162.83a38.21 38.21 0 0 0-18.24-32.76Z"
                    />
                    <path
                      fill="currentColor"
                      d="M307.88 318.05c-37.29 0-45.24-10.42-47.6-27.24a8.43 8.43 0 0 0-8.22-7.32h-19.8a8.44 8.44 0 0 0-8.26 8.58c0 14.58 5.12 62.17 83.92 62.17c24.38 0 44.66-5.7 58.63-16.49S388 311.26 388 292.55c0-37.55-24.5-47.83-72.75-54.55c-49.05-6.82-49.05-10.29-49.05-17.89c0-5.47 0-18.28 35.46-18.28c25.23 0 38.74 3.19 43.06 20a8.35 8.35 0 0 0 8.06 6.67h19.87a8.24 8.24 0 0 0 6.16-2.86a8.91 8.91 0 0 0 2.12-6.44c-2.57-35.55-28.56-53.58-79.24-53.58c-46.06 0-73.55 20.75-73.55 55.5c0 38.1 28.49 48.87 71.29 53.33c50 5.17 50 12.71 50 19.37c.03 10.38-4.28 24.23-41.55 24.23Z"
                    />
                  </svg>
                </span>
                <span class="region">us-east-1</span>
              </div>
            </Item>
          </ul>
        </Resource>
        <Resource type="outputs">
          <div class="title">
            <h1>
              <span>Outputs</span>
            </h1>
          </div>
          <ul>
            <Item>
              <div class="left">
                <span class="name">ApiEndpoint</span>
              </div>
              <div class="right">
                <span class="value">
                  https://mwismf5e9l.execute-api.us-east-1.amazonaws.com/prod
                </span>
                <CopyButton class="copy" href="/">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="32"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      d="M5 22q-.825 0-1.413-.588T3 20V7q0-.425.288-.713T4 6q.425 0 .713.288T5 7v13h10q.425 0 .713.288T16 21q0 .425-.288.713T15 22H5Zm4-4q-.825 0-1.413-.588T7 16V4q0-.825.588-1.413T9 2h9q.825 0 1.413.588T20 4v12q0 .825-.588 1.413T18 18H9Zm0-2h9V4H9v12Zm0 0V4v12Z"
                    />
                  </svg>
                </CopyButton>
              </div>
            </Item>
            <Item>
              <div class="left">
                <span class="name">ServerlessDeploymentBucketName</span>
              </div>
              <div class="right">
                <span class="value">
                  mono-repo-sls-groups-pro-serverlessdeploymentbuck-1kmkojwrhblsj
                </span>
                <CopyButton class="copy" href="/">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="32"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      d="M5 22q-.825 0-1.413-.588T3 20V7q0-.425.288-.713T4 6q.425 0 .713.288T5 7v13h10q.425 0 .713.288T16 21q0 .425-.288.713T15 22H5Zm4-4q-.825 0-1.413-.588T7 16V4q0-.825.588-1.413T9 2h9q.825 0 1.413.588T20 4v12q0 .825-.588 1.413T18 18H9Zm0-2h9V4H9v12Zm0 0V4v12Z"
                    />
                  </svg>
                </CopyButton>
              </div>
            </Item>
            <Item>
              <div class="left">
                <span class="name">HelloLambdaFunctionQualifiedArn</span>
              </div>
              <div class="right">
                <span class="value">
                  arn:aws:lambda:us-east-1:087220554750:function:mono-repo-sls-groups-prod-hello:3
                </span>
                <CopyButton class="copy" href="/">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="32"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      d="M5 22q-.825 0-1.413-.588T3 20V7q0-.425.288-.713T4 6q.425 0 .713.288T5 7v13h10q.425 0 .713.288T16 21q0 .425-.288.713T15 22H5Zm4-4q-.825 0-1.413-.588T7 16V4q0-.825.588-1.413T9 2h9q.825 0 1.413.588T20 4v12q0 .825-.588 1.413T18 18H9Zm0-2h9V4H9v12Zm0 0V4v12Z"
                    />
                  </svg>
                </CopyButton>
              </div>
            </Item>
          </ul>
        </Resource>
      </Content>
    </Root>
  );
}
