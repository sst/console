import { Button, Fullscreen, Stack, Text } from "$/ui";
import { WorkspaceIcon } from "$/ui/workspace-icon";
import { styled } from "@macaron-css/solid";
import { useWorkspace } from ".";
import { utility } from "$/ui/utility";
import { FormInput } from "$/ui/form";
import { createId } from "@paralleldrive/cuid2";
import { useReplicache } from "$/providers/replicache";
import { useNavigate } from "@solidjs/router";

const Form = styled("form", {
  base: {
    width: 320,
    ...utility.stack(5),
  },
});

export function User() {
  const workspace = useWorkspace();
  const rep = useReplicache();
  const nav = useNavigate();
  return (
    <Fullscreen>
      <Stack horizontal="center" space="5">
        <WorkspaceIcon text={workspace().slug} />
        <Stack horizontal="center" space="2">
          <Text size="lg" weight="medium">
            Add a user to this workspace
          </Text>
          <Text color="secondary">
            Enter their email and we'll send an invite
          </Text>
        </Stack>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const id = createId();
            const email = fd.get("email") as string;
            await rep().mutate.user_create({
              id,
              email,
            });
            nav(`/${workspace()?.slug}`);
          }}
        >
          <FormInput
            type="email"
            autofocus
            name="email"
            hint="Need copy here"
            placeholder="user@example.com"
          />
          <Button type="submit">Send Invite</Button>
        </Form>
      </Stack>
    </Fullscreen>
  );
}
