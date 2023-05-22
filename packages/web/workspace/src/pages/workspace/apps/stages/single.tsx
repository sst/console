import sst from "./sst.png";
import patrick from "./patrick.jpg";
import { styled } from "@macaron-css/solid";
import { Button } from "../../../../ui/button";
import { theme } from "../../../../ui/theme";

const Root = styled("div", {
  base: {
    position: "fixed",
    inset: 0,
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

const SwitcherAppButton = styled("button", {
  base: {
    flex: "0 0 auto",
    padding: `0 ${theme.navbarPadding} 0 0`,
    border: "0",
    borderRadius: "4px",
    backgroundColor: "transparent",
    transition: `border ${theme.colorFadeDuration} ease-out`,
    ":hover": {
      borderColor: theme.color.button.secondary.hover.border,
    },
  },
});

const SwitcherAppIcon = styled("img", {
  base: {
    display: "block",
    borderRadius: theme.borderRadius,
  },
});

const SwitcherText = styled("div", {
  base: {
    flex: "1 1 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `0 0 0 ${theme.navbarPadding}`,
    borderLeft: `1px solid ${theme.color.divider.base}`,
    ":hover": {
      cursor: "pointer",
    },
  },
});

const SwitcherBreadcrumb = styled("div", {
  base: {
    marginRight: "7px",
  },
});

const SwitcherBreadcrumbText = styled("div", {
  base: {
    font: theme.fonts.heading,
    color: theme.color.text.secondary,
    ":first-child": {
      fontWeight: "500",
    },
    ":last-child": {
      marginTop: "5px",
      fontSize: "0.875rem",
      color: theme.color.text.dimmed,
    },
  },
});

const SwitcherSvg = styled("svg", {
  base: {
    display: "block",
    width: "20px",
    height: "20px",
    color: theme.color.base.black,
  },
});

const SwitcherIcon = styled("span", {
  base: {
    padding: "5px 0",
    borderRadius: "10px",
    opacity: "0.7",
    color: theme.color.text.dimmed,
    transition: `background-color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      [`${SwitcherText}:active > &`]: {
        backgroundColor: theme.color.button.secondary.active,
      },
    },
  },
});

const Sidebar = styled("div", {
  base: {
    width: "240px",
    flexShrink: 0,
    borderRight: "1px solid hsl(240deg 28% 14% / 8%)",
  },
});

const SidebarHeader = styled("div", {
  base: {
    padding: theme.space[4],
  },
});

const SidebarAvatar = styled("div", {
  base: {
    width: 36,
    aspectRatio: "1/1",
    background: "black",
    borderRadius: 4,
  },
});
export function Single() {
  return (
    <Root>
      <Navbar>
        <Switcher>
          <SwitcherAppButton>
            <SwitcherAppIcon width="32px" src={sst} />
          </SwitcherAppButton>
          <SwitcherText>
            <SwitcherBreadcrumb>
              <SwitcherBreadcrumbText>my-sst-app</SwitcherBreadcrumbText>
              <SwitcherBreadcrumbText>prod</SwitcherBreadcrumbText>
            </SwitcherBreadcrumb>
            <SwitcherIcon>
              <SwitcherSvg
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z"
                  clip-rule="evenodd"
                ></path>
              </SwitcherSvg>
            </SwitcherIcon>
          </SwitcherText>
        </Switcher>
        <User>
          <UserImage width="28px" src={patrick} />
        </User>
      </Navbar>
      <Sidebar>
        <SidebarHeader>
          <SidebarAvatar />
        </SidebarHeader>
      </Sidebar>
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
    </Root>
  );
}
