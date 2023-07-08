import { Button, Fullscreen, Stack, Text } from "$/ui";
import { WorkspaceIcon } from "$/ui/workspace-icon";
import { styled } from "@macaron-css/solid";
import { useWorkspace } from ".";
import { utility } from "$/ui/utility";
import { FormInput } from "$/ui/form";
import { createId } from "@paralleldrive/cuid2";
import { useReplicache } from "$/providers/replicache";
import { Link, useNavigate } from "@solidjs/router";

const Form = styled("form", {
  base: {
    width: 320,
    ...utility.stack(5),
  },
});

export function Account() {
  const workspace = useWorkspace();
  return (
    <Fullscreen>
      <Stack horizontal="center" space="5">
        <WorkspaceIcon text={workspace().slug} />
        <Stack horizontal="center" space="2">
          <Text size="lg" weight="medium">
            Connect an AWS Account
          </Text>
          <Text color="secondary">Blah blah</Text>
        </Stack>
        <a
          target="_blank"
          href={`https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/quickcreate?region=us-east-1&param_workspaceID=${
            workspace().id
          }&stackName=SSTConsole-${workspace().id}&templateURL=${
            import.meta.env.VITE_CONNECT_URL
          }`}
        >
          <Button type="submit">Connect</Button>
        </a>
      </Stack>
    </Fullscreen>
  );
}
