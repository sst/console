import { Button, Fullscreen, Row, Stack, Text, theme } from "$/ui";
import { WorkspaceIcon } from "$/ui/workspace-icon";
import { styled } from "@macaron-css/solid";
import { useWorkspace } from ".";
import { utility } from "$/ui/utility";
import { FormInput } from "$/ui/form";
import { createId } from "@paralleldrive/cuid2";
import { useReplicache } from "$/providers/replicache";
import { Link, useNavigate } from "@solidjs/router";
import { IconArrowLongLeft, IconArrowLongRight } from "$/ui/icons";
import { IconAws } from "$/ui/icons/custom";
import { Header } from "./header";

const AddAccountGraphicAwsIcon = styled("div", {
  base: {
    width: 36,
    height: 36,
    padding: 5,
    color: "#FF9900",
    boxSizing: "border-box",
    borderRadius: theme.borderRadius,
    backgroundColor: theme.color.background.surface,
    border: `1px solid ${theme.color.divider.base}`,
  },
});

const AddAccountGraphicConnectIcon = styled("div", {
  base: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
});

const AddAccountGraphicConnectArrowIcon = styled("div", {
  base: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -8,
    width: 16,
    height: 16,
    color: theme.color.text.dimmed.base,
  },
  variants: {
    direction: {
      left: {
        marginTop: -13,
      },
      right: {
        marginTop: -3,
      },
    },
  },
});

const AddAccountHint = styled("div", {
  base: {
    borderRadius: theme.borderRadius,
    boxSizing: "border-box",
  },
});

const AddAccountHintSteps = styled("ul", {
  base: {
    ...utility.stack(3),
    listStyle: "circle inside",
    color: theme.color.text.dimmed.base,
    fontSize: theme.font.size.sm,
  },
});

const AddAccountStepsFooter = styled("div", {
  base: {
    ...utility.stack(2.5),
    minWidth: 360,
    paddingTop: theme.space[5],
    borderTop: `1px solid ${theme.color.divider.base}`,
    textAlign: "center",
    alignItems: "stretch",
  },
});

export function Account() {
  const workspace = useWorkspace();
  const nav = useNavigate();
  return (
    <>
      <Header />
      <Fullscreen>
        <Stack space="5" vertical="center">
          <Row horizontal="center" space="4">
            <WorkspaceIcon text="acme" />
            <AddAccountGraphicConnectIcon>
              <AddAccountGraphicConnectArrowIcon direction="left">
                <IconArrowLongLeft />
              </AddAccountGraphicConnectArrowIcon>
              <AddAccountGraphicConnectArrowIcon direction="right">
                <IconArrowLongRight />
              </AddAccountGraphicConnectArrowIcon>
            </AddAccountGraphicConnectIcon>
            <AddAccountGraphicAwsIcon>
              <IconAws />
            </AddAccountGraphicAwsIcon>
          </Row>
          <Stack horizontal="center" space="2">
            <Text size="lg" weight="medium">
              Connect an AWS account
            </Text>
            <Text color="secondary">
              Let's connect an AWS account to your workspace
            </Text>
          </Stack>
          <AddAccountHint>
            <AddAccountHintSteps>
              <li>This deploys a CloudFormation stack to your account</li>
              <li>It contains an IAM Role and a Lambda function</li>
              <li>It'll scan all your AWS regions for SST apps</li>
              <li>And it'll subscribe to them and listen for changes</li>
            </AddAccountHintSteps>
          </AddAccountHint>
          <AddAccountStepsFooter>
            <Text size="sm" color="secondary">
              Make sure this stack is deployed to <b>us-east-1</b>
            </Text>
            <a
              target="_blank"
              onClick={() => nav(`../?force=true`)}
              href={`https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/quickcreate?region=us-east-1&param_workspaceID=${
                workspace().id
              }&stackName=SSTConsole-${workspace().id}&templateURL=${
                import.meta.env.VITE_CONNECT_URL
              }`}
            >
              <Button style={{ width: "100%" }} color="primary">
                Connect an AWS Account
              </Button>
            </a>
            <Text size="xs" color="dimmed">
              You can always connect another account later
            </Text>
          </AddAccountStepsFooter>
        </Stack>
      </Fullscreen>
    </>
  );
}
