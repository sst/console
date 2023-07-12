import { account } from "$/data/storage";
import { WorkspaceStore } from "$/data/workspace";
import { useAuth } from "$/providers/auth";
import { createSubscription } from "$/providers/replicache";
import {
  Button,
  FormInput,
  Fullscreen,
  Stack,
  WorkspaceIcon,
  Text,
  utility,
} from "$/ui";
import { styled } from "@macaron-css/solid";
import { createId } from "@paralleldrive/cuid2";
import { useNavigate } from "@solidjs/router";
import { Show, createEffect, createMemo, createSignal } from "solid-js";

const Form = styled("form", {
  base: {
    width: 320,
    ...utility.stack(5),
  },
});

export function WorkspaceCreate() {
  const auth = useAuth();
  const nav = useNavigate();
  const rep = createMemo(() => auth[account()].replicache);
  const workspaces = createSubscription(WorkspaceStore.list, [], rep);
  const [pending, setPending] = createSignal<string>();

  createEffect(() => {
    const match = workspaces().find((w) => w.slug === pending());
    if (!match) return;
    nav("/" + match.slug + "/account");
  });

  return (
    <Fullscreen>
      <Stack space="5">
        <Stack horizontal="center" space="5">
          <WorkspaceIcon text="acme" />
          <Stack horizontal="center" space="2">
            <Text size="lg" weight="medium">
              Create a new workspace
            </Text>
            <Text color="secondary" on="base">
              Start by giving your workspace a name
            </Text>
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
      </Stack>
    </Fullscreen>
  );
}
