import { styled } from "@macaron-css/solid";
import { Link } from "@solidjs/router";
import { theme } from "$/ui";
import { Text } from "$/ui/text";
import { Stack, Fullscreen } from "$/ui/layout";
import { Header } from "./workspace/header";

const HomeLink = styled(Link, {
  base: {
    fontSize: theme.font.size.sm,
  },
});

const NotAllowedDesc = styled("div", {
  base: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary.base,
  },
});

export function NotFound() {
  return (
    <>
      <Header />
      <Fullscreen inset="root">
        <Stack space="2.5" horizontal="center">
          <Text size="lg">Page not found</Text>
          <HomeLink href="/">Go back home</HomeLink>
        </Stack>
      </Fullscreen>
    </>
  );
}

export function NotAllowed() {
  return (
    <>
      <Header />
      <Fullscreen inset="root">
        <Stack space="2.5" horizontal="center">
          <Text size="lg">Access not allowed</Text>
          <NotAllowedDesc>
            You don't have access to this page,{" "}
            <HomeLink href="/">go back home</HomeLink>.
          </NotAllowedDesc>
        </Stack>
      </Fullscreen>
    </>
  );
}