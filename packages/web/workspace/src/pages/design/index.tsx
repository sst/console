import { globalStyle, globalKeyframes, CSSProperties } from "@macaron-css/core";
import { SpanSpacer, Grower, Stack, Row, Hr } from "$/ui/layout";
import { styled } from "@macaron-css/solid";
import { theme } from "$/ui/theme";
import { IconCheck, IconBookmark } from "$/ui/icons";
import { Text } from "$/ui/text";
import { Tag } from "$/ui/tag";
import { Alert } from "$/ui/alert";
import {
  FormInput,
  FormSelect,
  FormTextArea,
  SplitOptions,
  SplitOptionsOption,
} from "$/ui/form";
import { Dropdown } from "$/ui/dropdown";
import {
  Button,
  TabTitle,
  LinkButton,
  IconButton,
  TextButton,
  ButtonGroup,
} from "$/ui/button";
import { utility } from "$/ui/utility";
import { IconGitHub } from "$/ui/icons/custom";
import { For, JSX, Show, ComponentProps } from "solid-js";
import { AvatarInitialsIcon } from "$/ui/avatar-icon";

const ComponentRoot = styled("div", {
  base: {
    padding: theme.space[4],
  },
});

const ComponentName = styled("h1", {
  base: {
    fontSize: theme.font.size.mono_base,
    textTransform: "uppercase",
    paddingBottom: theme.space[6],
    fontFamily: theme.font.family.heading,
  },
});

const ComponentVariants = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: theme.space[4],
  },
});

const VariantRoot = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: theme.space[4],
  },
});

const VariantName = styled("h2", {
  base: {
    flex: "0 0 auto",
    fontSize: theme.font.size.mono_sm,
    textTransform: "uppercase",
    fontFamily: theme.font.family.heading,
  },
});

const VariantContent = styled("div", {
  base: {
    flex: "1 1 auto",
    display: "flex",
    gap: theme.space[2],
    border: `1px solid ${theme.color.divider.base}`,
    padding: theme.space[4],
    borderRadius: theme.borderRadius,
  },
});

const VariantThemes = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: theme.space[2],
  },
});

interface ComponentTypeProps {
  name: string;
  children: JSX.Element;
}

function ComponentType(props: ComponentTypeProps) {
  return (
    <ComponentRoot>
      <ComponentName>{props.name}</ComponentName>
      <ComponentVariants>{props.children}</ComponentVariants>
    </ComponentRoot>
  );
}

type VariantProps = ComponentProps<typeof VariantRoot> & {
  themes?: boolean;
  name: string;
};

function Variant(props: VariantProps) {
  return (
    <VariantRoot {...props}>
      <VariantName>{props.name}</VariantName>
      <VariantContent>{props.children}</VariantContent>
    </VariantRoot>
  );
}
const OverflowSpan = styled("span", {
  base: {
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
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

const TextContainer = styled("div", {
  base: {
    padding: theme.space[4],
  },
  variants: {
    background: {
      base: {
        backgroundColor: theme.color.background.base,
      },
      surface: {
        backgroundColor: theme.color.background.surface,
      },
      inverted: {
        backgroundColor: theme.color.button.github.color,
      },
    },
  },
  defaultVariants: {
    background: "base",
  },
});

export function Design() {
  return (
    <>
      <ComponentType name="Text">
        <Variant name="Base">
          <TextContainer background="base">
            <Text color="primary" on="base">
              TextName
            </Text>
            <Text color="secondary" on="base">
              TextName
            </Text>
            <Text color="dimmed" on="base">
              TextName
            </Text>
            <Text color="danger" on="base">
              TextName
            </Text>
          </TextContainer>
        </Variant>
        <Variant name="Surface">
          <TextContainer background="surface">
            <Text color="primary" on="surface">
              TextName
            </Text>
            <Text color="secondary" on="surface">
              TextName
            </Text>
            <Text color="dimmed" on="surface">
              TextName
            </Text>
            <Text color="danger" on="surface">
              TextName
            </Text>
          </TextContainer>
        </Variant>
        <Variant name="Inverted">
          <TextContainer background="inverted">
            <Text color="primary" on="inverted">
              TextName
            </Text>
            <Text color="secondary" on="inverted">
              TextName
            </Text>
            <Text color="dimmed" on="inverted">
              TextName
            </Text>
            <Text color="danger" on="inverted">
              TextName
            </Text>
          </TextContainer>
        </Variant>
      </ComponentType>
      <ComponentType name="Button">
        <Variant name="Primary">
          <Button color="primary">Button</Button>
          <Button data-state-hover color="primary">
            Button
          </Button>
          <Button active color="primary">
            Button
          </Button>
          <Button disabled color="primary">
            Button
          </Button>
        </Variant>
        <Variant name="Success">
          <Button color="success">Button</Button>
          <Button data-state-hover color="success">
            Button
          </Button>
          <Button active color="success">
            Button
          </Button>
          <Button disabled color="success">
            Button
          </Button>
        </Variant>
        <Variant name="Danger">
          <Button color="danger">Button</Button>
          <Button data-state-hover color="danger">
            Button
          </Button>
          <Button active color="danger">
            Button
          </Button>
          <Button disabled color="danger">
            Button
          </Button>
        </Variant>
        <Variant name="Secondary">
          <Button color="secondary">Button</Button>
          <Button data-state-hover color="secondary">
            Button
          </Button>
          <Button active color="secondary">
            Button
          </Button>
          <Button disabled color="secondary">
            Button
          </Button>
        </Variant>
        <Variant name="GitHub">
          <Button color="github">
            <ButtonIcon>
              <IconGitHub />
            </ButtonIcon>
            Login with GitHub
          </Button>
          <Button data-state-hover color="github">
            <ButtonIcon>
              <IconGitHub />
            </ButtonIcon>
            Login with GitHub
          </Button>
          <Button active color="github">
            <ButtonIcon>
              <IconGitHub />
            </ButtonIcon>
            Login with GitHub
          </Button>
          <Button disabled color="github">
            <ButtonIcon>
              <IconGitHub />
            </ButtonIcon>
            Login with GitHub
          </Button>
        </Variant>
        <Variant name="Small">
          <Button size="sm" color="primary">
            Button
          </Button>
          <Button size="sm" color="secondary">
            Button
          </Button>
          <Button size="sm" color="success">
            Button
          </Button>
          <Button size="sm" color="danger">
            Button
          </Button>
        </Variant>
        <Variant name="Grouped">
          <ButtonGroup>
            <Button grouped="left" color="primary">
              Resolve
            </Button>
            <Button grouped="middle" color="secondary">
              Ignore
            </Button>
            <Button grouped="middle" color="success">
              Success
            </Button>
            <Button grouped="right" color="danger">
              Remove
            </Button>
          </ButtonGroup>
        </Variant>
        <Variant name="Grouped Small">
          <ButtonGroup>
            <Button size="sm" grouped="left" color="primary">
              Resolve
            </Button>
            <Button size="sm" grouped="middle" color="secondary">
              Ignore
            </Button>
            <Button size="sm" grouped="middle" color="success">
              Success
            </Button>
            <Button size="sm" grouped="right" color="danger">
              Remove
            </Button>
          </ButtonGroup>
        </Variant>
      </ComponentType>
      <ComponentType name="TextButton">
        <Variant name="Base">
          <TextContainer>
            <Row space="4">
              <TextButton on="base" icon={<IconBookmark />}>
                Button
              </TextButton>
              <TextButton data-state-hover on="base" icon={<IconBookmark />}>
                Button
              </TextButton>
              <TextButton completing on="base" icon={<IconBookmark />}>
                Button
              </TextButton>
            </Row>
          </TextContainer>
        </Variant>
        <Variant name="Surface">
          <TextContainer background="surface">
            <Row space="4">
              <TextButton on="surface" icon={<IconBookmark />}>
                Button
              </TextButton>
              <TextButton data-state-hover on="surface" icon={<IconBookmark />}>
                Button
              </TextButton>
              <TextButton completing on="surface" icon={<IconBookmark />}>
                Button
              </TextButton>
            </Row>
          </TextContainer>
        </Variant>
        <Variant name="No Icon">
          <TextContainer>
            <Row space="4">
              <TextButton on="base">Button</TextButton>
              <TextButton data-state-hover on="base">
                Button
              </TextButton>
              <TextButton completing on="base">
                Button
              </TextButton>
            </Row>
          </TextContainer>
        </Variant>
      </ComponentType>
      <ComponentType name="IconButton">
        <Variant name="Base">
          <TextContainer>
            <Row space="4">
              <IconButton>
                <IconBookmark width={24} height={24} />
              </IconButton>
              <IconButton data-state-hover>
                <IconBookmark width={24} height={24} />
              </IconButton>
              <IconButton disabled>
                <IconBookmark width={24} height={24} />
              </IconButton>
            </Row>
          </TextContainer>
        </Variant>
      </ComponentType>
      <ComponentType name="TabTitle">
        <Variant name="Base">
          <TextContainer>
            <Row space="4">
              <TabTitle state="active">Button</TabTitle>
              <TabTitle state="inactive">Button</TabTitle>
              <TabTitle state="disabled">Button</TabTitle>
            </Row>
          </TextContainer>
        </Variant>
        <Variant name="Count">
          <TextContainer>
            <Row space="4">
              <TabTitle count="4" state="active">
                Button
              </TabTitle>
              <TabTitle count="4" state="inactive">
                Button
              </TabTitle>
              <TabTitle count="4" state="disabled">
                Button
              </TabTitle>
            </Row>
          </TextContainer>
        </Variant>
        <Variant name="Long Count">
          <TextContainer>
            <Row space="4">
              <TabTitle count="41+" state="active">
                Button
              </TabTitle>
              <TabTitle count="41+" state="inactive">
                Button
              </TabTitle>
              <TabTitle count="41+" state="disabled">
                Button
              </TabTitle>
            </Row>
          </TextContainer>
        </Variant>
      </ComponentType>
      <ComponentType name="Alert">
        <Variant name="Info">
          <Grower>
            <Alert level="info">
              This is an info alert. You don't need to take it very seriously.
            </Alert>
          </Grower>
        </Variant>
        <Variant name="Danger">
          <Grower>
            <Alert level="danger">
              This is a danger alert. You need to take it very seriously.
            </Alert>
          </Grower>
        </Variant>
        <Variant name="Details">
          <Grower>
            <Alert
              level="danger"
              details={`We could not enable issues for these functions:
  - function1 (not found)
  - function2 (subscriber limit)
  - function3 (no iam permissions)

Read more about it over on our docs`}
            >
              This is a danger alert. You need to take it very seriously.
            </Alert>
          </Grower>
        </Variant>
        <Variant name="Multi Line">
          <Grower>
            <Alert level="info">
              This is an info alert. You don't need to take it very seriously.
              But it is a long info alert that will overflow. And we want to
              test how long it can really get. So here is some more text.
            </Alert>
          </Grower>
        </Variant>
        <Variant name="Multi Line Details">
          <Grower>
            <Alert details="Read more about it on our docs." level="info">
              This is an info alert. You don't need to take it very seriously.
              But it is a long info alert that will overflow. And we want to
              test how long it can really get. So here is some more text.
            </Alert>
          </Grower>
        </Variant>
      </ComponentType>
      <ComponentType name="Tag">
        <Variant name="Solid">
          <Tag style="solid" level="info">
            Tag
          </Tag>
          <Tag style="solid" level="tip">
            Tag
          </Tag>
          <Tag style="solid" level="caution">
            Tag
          </Tag>
          <Tag style="solid" level="danger">
            Tag
          </Tag>
        </Variant>
        <Variant name="Outline">
          <Tag style="outline" level="info">
            Tag
          </Tag>
          <Tag style="outline" level="tip">
            Tag
          </Tag>
          <Tag style="outline" level="caution">
            Tag
          </Tag>
          <Tag style="outline" level="danger">
            Tag
          </Tag>
        </Variant>
        <Variant name="Icon">
          <Tag style="outline" level="info">
            <IconCheck width="12" height="12" />
          </Tag>
          <Tag style="outline" level="tip">
            <IconCheck width="12" height="12" />
          </Tag>
          <Tag style="outline" level="caution">
            <IconCheck width="12" height="12" />
          </Tag>
          <Tag style="outline" level="danger">
            <IconCheck width="12" height="12" />
          </Tag>
        </Variant>
      </ComponentType>
      <ComponentType name="AvatarInitialsIcon">
        <Variant name="Default">
          <AvatarInitialsIcon type="workspace" text="S" />
          <AvatarInitialsIcon type="workspace" text="SST" />
          <AvatarInitialsIcon type="workspace" text="Spongebob" />
          <AvatarInitialsIcon type="workspace" text="Krusty-Krab" />
          <AvatarInitialsIcon type="workspace" text="Krusty Krab" />
          <AvatarInitialsIcon type="workspace" text="Krusty___Krab" />
          <AvatarInitialsIcon type="workspace" text="Krusty.Krab" />
          <AvatarInitialsIcon type="workspace" text="1" />
          <AvatarInitialsIcon type="workspace" text="123" />
          <AvatarInitialsIcon type="workspace" text="1-2" />
          <AvatarInitialsIcon type="workspace" text="1Krusty-2Krab" />
          <AvatarInitialsIcon type="workspace" text="patrick@example.com" />
          <AvatarInitialsIcon
            type="workspace"
            text="patrick_start@example.com"
          />
          <AvatarInitialsIcon type="workspace" text="patrick2002@example.com" />
          <AvatarInitialsIcon type="workspace" text="$-_.+! *'()" />
          <AvatarInitialsIcon type="workspace" text="" />
        </Variant>
        <Variant name="User">
          <AvatarInitialsIcon type="user" text="Patrick Star" />
        </Variant>
        <Variant name="Custom Size">
          <AvatarInitialsIcon
            text="S"
            type="workspace"
            style={{ width: "48px", height: "48px" }}
          />
        </Variant>
      </ComponentType>
      <ComponentType name="Split Options">
        <Variant name="Base">
          <SplitOptions size="base">
            <SplitOptionsOption>Active</SplitOptionsOption>
            <SplitOptionsOption selected>Ignored</SplitOptionsOption>
            <SplitOptionsOption>Resolved</SplitOptionsOption>
          </SplitOptions>
        </Variant>
        <Variant name="Small">
          <SplitOptions size="sm">
            <SplitOptionsOption>Active</SplitOptionsOption>
            <SplitOptionsOption selected>Ignored</SplitOptionsOption>
            <SplitOptionsOption>Resolved</SplitOptionsOption>
          </SplitOptions>
        </Variant>
      </ComponentType>
      <ComponentType name="Dropdown">
        <Variant name="Default">
          <Dropdown label="Dropdown">
            <Dropdown.Item>Live</Dropdown.Item>
            <Dropdown.Item>Recent</Dropdown.Item>
            <Dropdown.Seperator />
            <Dropdown.Item>Selected</Dropdown.Item>
            <Dropdown.Item>
              A really really really long dropdown option that should overflow
            </Dropdown.Item>
          </Dropdown>
        </Variant>
        <Variant name="RadioGroup">
          <Dropdown label="Dropdown">
            <Dropdown.RadioGroup value="selected">
              <Dropdown.RadioItem value="live">Live</Dropdown.RadioItem>
              <Dropdown.RadioItem value="recent">Recent</Dropdown.RadioItem>
              <Dropdown.Seperator />
              <Dropdown.RadioItem value="selected">Selected</Dropdown.RadioItem>
              <Dropdown.RadioItem value="long">
                A really really really long dropdown option that should overflow
              </Dropdown.RadioItem>
            </Dropdown.RadioGroup>
          </Dropdown>
        </Variant>
        <Variant name="Sm">
          <Dropdown size="sm" label="Dropdown">
            <Dropdown.RadioGroup value="selected">
              <Dropdown.RadioItem value="live">Live</Dropdown.RadioItem>
            </Dropdown.RadioGroup>
          </Dropdown>
        </Variant>
        <Variant name="Overflow">
          <Dropdown
            size="base"
            label="A really really really long dropdown option that should overflow"
          >
            <Dropdown.RadioGroup value="selected">
              <Dropdown.RadioItem value="live">Live</Dropdown.RadioItem>
            </Dropdown.RadioGroup>
          </Dropdown>
        </Variant>
        <Variant name="Icon">
          <Dropdown icon={<IconBookmark width={24} height={24} />}>
            <Dropdown.Item>Live</Dropdown.Item>
          </Dropdown>
        </Variant>
      </ComponentType>
      <ComponentType name="Forms">
        <Variant name="Default">
          <Grower>
            <FormTest />
          </Grower>
        </Variant>
      </ComponentType>
      <ComponentType name="Row">
        <Variant name="Default">
          <Row space="1">
            <span>Label</span>
            <span>Value</span>
          </Row>
        </Variant>
        <Variant name="Overflow">
          <Row space="1">
            <span>Label</span>
            <OverflowSpan>
              /notes/settings/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long
            </OverflowSpan>
          </Row>
        </Variant>
        <Variant name="No Shrink">
          <Row space="1">
            <OverflowSpan>
              /notes/settings/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long/absurdly/long/path/that/should/overflow/because/its/way/too/long
            </OverflowSpan>
            <Row flex={false} space="1">
              <span>11.2 MB</span>
              <span>us-east-1</span>
            </Row>
          </Row>
        </Variant>
      </ComponentType>
    </>
  );
}

function FormTest() {
  return (
    <form>
      <Stack space="7">
        <FormInput label="Workspace Name" placeholder="Acme Inc." type="text" />
        <FormInput
          label="Workspace Name"
          placeholder="Acme Inc."
          type="text"
          disabled
          value="Acme Inc."
        />
        <FormInput
          label="Workspace Name"
          placeholder="Acme Inc."
          type="text"
          hint="Needs to be lowercase, unique, and URL friendly."
        />
        <FormInput
          color="danger"
          label="Workspace Name"
          placeholder="Acme Inc."
          type="text"
          hint="Needs to be lowercase, unique, and URL friendly."
          value="Invalid Value"
        />
        <FormTextArea label="Workspace Description" placeholder="Acme Inc." />
        <FormTextArea
          disabled
          label="Workspace Description"
          placeholder="Acme Inc."
        />
        <FormTextArea
          label="Workspace Description"
          placeholder="Acme Inc."
          hint="Needs to be lowercase, unique, and URL friendly."
        />
        <FormTextArea
          color="danger"
          label="Workspace Description"
          placeholder="Acme Inc."
          hint="Needs to be lowercase, unique, and URL friendly."
        >
          Invalid Description
        </FormTextArea>
        <FormSelect required label="Workspace">
          <option value="" disabled selected hidden>
            Select your workspace
          </option>
          <option>acme</option>
          <option>acme-2</option>
          <option>acme-3</option>
        </FormSelect>
        <FormSelect required disabled label="Workspace">
          <option value="" disabled selected hidden>
            Select your workspace
          </option>
          <option>acme</option>
          <option>acme-2</option>
          <option>acme-3</option>
        </FormSelect>
        <FormSelect
          required
          label="Workspace"
          hint="You need to create a workspace to get started."
        >
          <option value="" disabled selected hidden>
            Select your workspace
          </option>
          <option>acme</option>
          <option>acme-2</option>
          <option>acme-3</option>
        </FormSelect>
        <FormSelect
          color="danger"
          required
          label="Workspace"
          hint="You need to create a workspace to get started."
        >
          <option>No workspace available</option>
        </FormSelect>
      </Stack>
    </form>
  );
}
