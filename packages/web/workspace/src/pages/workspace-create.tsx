import { WorkspaceStore } from "$/data/workspace";
import { useStorage } from "$/providers/account";
import { useAuth } from "$/providers/auth";
import {
  Text,
  Input,
  theme,
  Stack,
  Button,
  utility,
  FormField,
  Fullscreen,
  AvatarInitialsIcon,
} from "$/ui";
import { styled } from "@macaron-css/solid";
import {
  FormError,
  createForm,
  setError,
  valiForm,
} from "@modular-forms/solid";
import { createId } from "@paralleldrive/cuid2";
import { useNavigate } from "@solidjs/router";
import { Show, createEffect, createMemo, createSignal } from "solid-js";
import { minLength, object, string, regex } from "valibot";
import { Header } from "./workspace/header";

const CreateWorkspaceHint = styled("ul", {
  base: {
    ...utility.stack(2.5),
    width: "100%",
    padding: `${theme.space[4]} ${theme.space[3]} ${theme.space[4]} 30px`,
    listStyle: "circle",
    backgroundColor: theme.color.background.surface,
    borderRadius: theme.borderRadius,
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary.surface,
  },
});

const FieldList = styled("div", {
  base: {
    width: 320,
    ...utility.stack(5),
  },
});

export function WorkspaceCreate() {
  const [form, { Form, Field }] = createForm({
    validate: valiForm(
      object({
        slug: string([
          minLength(3, "Must be at least 3 characters long."),
          regex(/^[a-z0-9\-]+$/, "Must be lowercase, URL friendly."),
        ]),
      })
    ),
  });
  const auth = useAuth();
  const storage = useStorage();
  const nav = useNavigate();
  const rep = createMemo(() => auth[storage.value.account].replicache);
  const id = createId();
  const workspace = WorkspaceStore.get.watch(rep, () => [id]);
  const [slug, setSlug] = createSignal("");
  const pending = createMemo(() => workspace() != null);

  createEffect((prev) => {
    console.log(workspace());
    if (prev && !pending())
      setError(form, "slug", "Workspace name is not unique");
    return pending();
  });

  createEffect(() => {
    if (workspace()?.timeCreated) nav("/" + workspace()?.slug + "/account");
  });

  return (
    <>
      <Header />
      <Fullscreen inset="root">
        <Stack space="5">
          <Stack horizontal="center" space="5">
            <AvatarInitialsIcon type="workspace" text={slug() || "-"} />
            <Stack horizontal="center" space="2">
              <Text size="lg" weight="medium">
                Create a new workspace
              </Text>
              <Text color="secondary" on="base">
                Start by giving your workspace a name
              </Text>
            </Stack>
            <CreateWorkspaceHint>
              <li>Create a workspace for your organization</li>
              <li>Invite your team & connect your accounts</li>
            </CreateWorkspaceHint>
          </Stack>
          <Form
            onSubmit={(data) => {
              rep().mutate.workspace_create({
                id,
                slug: data.slug,
              });
            }}
          >
            <FieldList>
              <Field name="slug">
                {(field, props) => (
                  <FormField
                    hint={
                      field.error
                        ? field.error
                        : "Needs to be lowercase, unique, and URL friendly."
                    }
                    color={field.error ? "danger" : "primary"}
                  >
                    <Input
                      {...props}
                      autofocus
                      placeholder="your-company-name"
                    />
                  </FormField>
                )}
              </Field>
              <Button type="submit" disabled={Boolean(pending())}>
                <Show when={pending()} fallback="Create Workspace">
                  Creating&hellip;
                </Show>
              </Button>
            </FieldList>
          </Form>
        </Stack>
      </Fullscreen>
    </>
  );
}
