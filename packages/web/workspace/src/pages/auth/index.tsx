import {account} from "$/data/storage";
import {WorkspaceStore} from "$/data/workspace";
import {useAuth} from "$/providers/auth";
import {createSubscription} from "$/providers/replicache";
import {Button} from "$/ui";
import {FormInput} from "$/ui/form";
import {IconApp, IconGitHub} from "$/ui/icons/custom";
import {Stack} from "$/ui/layout";
import {theme} from "$/ui/theme";
import {utility} from "$/ui/utility";
import {WorkspaceIcon} from "$/ui/workspace-icon";
import {styled} from "@macaron-css/solid";
import {createId} from "@paralleldrive/cuid2";
import {Route, Routes, useNavigate} from "@solidjs/router";
import {Show, createEffect, createMemo, createSignal} from "solid-js";

const Root = styled("div", {
  base: {
    ...utility.stack(8),
    position: "fixed",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});

const LoginIcon = styled("div", {
  base: {
    width: 42,
    height: 42,
    color: theme.color.accent,
  },
});

const Header = styled("h1", {
  base: {
    fontSize: theme.font.size.lg,
    fontWeight: 500,
  },
});

const Description = styled("p", {
  base: {
    color: theme.color.text.secondary,
  },
});

const ButtonIcon = styled("span", {
  base: {
    width: 18,
    height: 18,
    marginRight: 6,
    verticalAlign: -4,
    display: "inline-block",
  },
});

export function Login() {
  return (
    <Root>
      <Stack horizontal="center" space="5">
        <LoginIcon>
          <IconApp />
        </LoginIcon>
        <Stack horizontal="center" space="2">
          <Header>Welcome to the SST Console</Header>
          <Description>Log in with your GitHub to get started</Description>
        </Stack>
      </Stack>
      <a
        href={
          import.meta.env.VITE_AUTH_URL +
          "/authorize?" +
          new URLSearchParams({
            client_id: "solid",
            redirect_uri: location.origin + "/",
            response_type: "token",
            provider: "github",
          }).toString()
        }
      >
        <Button color="github">
          <ButtonIcon>
            <IconGitHub />
          </ButtonIcon>
          Login with GitHub
        </Button>
      </a>
    </Root>
  );
}

const Form = styled("form", {
  base: {
    width: 320,
    ...utility.stack(5),
  },
});

export function CreateWorkspace() {
  const auth = useAuth();
  const nav = useNavigate();
  const rep = createMemo(() => auth[account()].replicache);
  const workspaces = createSubscription(WorkspaceStore.list, [], rep);
  const [pending, setPending] = createSignal<string>();

  createEffect(() => {
    const match = workspaces().find((w) => w.slug === pending());
    if (!match) return;
    nav("/" + match.slug);
  });

  return (
    <Root>
      <Stack horizontal="center" space="5">
        <WorkspaceIcon text="acme" />
        <Stack horizontal="center" space="2">
          <Header>Create a new workspace</Header>
          <Description>Start by giving your workspace a name</Description>
        </Stack>
      </Stack>
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const slug = fd.get("slug") as string;
          setPending(slug);
          rep().mutate.workspace_create({
            id: createId(),
            slug,
          });
        }}
      >
        <FormInput
          autofocus
          name="slug"
          placeholder="acme"
          hint="Needs to be lowercase, unique, and URL friendly."
        />
        <Button type="submit" disabled={Boolean(pending())}>
          <Show when={pending()} fallback="Create Workspace">
            Creating&hellip;
          </Show>
        </Button>
      </Form>
    </Root>
  );
}
