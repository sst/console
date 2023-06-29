import { globalStyle, globalKeyframes, CSSProperties } from "@macaron-css/core";
import { Grower, Stack, Row } from "$/ui/layout";
import { styled } from "@macaron-css/solid";
import { theme } from "$/ui/theme";
import { IconArrowPath, IconChevronLeft, IconBoltSolid } from "$/ui/icons";
import { Tag } from "$/ui/tag";
import { Button } from "$/ui/button";
import { utility } from "$/ui/utility";
import { IconEventBus } from "$/ui/icons/custom";
import { WorkspaceIcon } from "../workspace/stage";
import { For, JSX } from "solid-js";

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
    fontSize: theme.font.size.mono_sm,
    textTransform: "uppercase",
    fontFamily: theme.font.family.heading,
  },
});

const VariantContent = styled("div", {
  base: {
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

interface VariantProps {
  themes?: boolean;
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

function Variant(props: VariantProps) {
  return (
    <VariantRoot>
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

export function Design() {
  return (
    <>
      <ComponentType name="ConnectingWorkspace">
        <Variant name="Default">
          <Grower>
            <ConnectingWorkspace />
          </Grower>
        </Variant>
      </ComponentType>
      <ComponentType name="ConnectWorkspace">
        <Variant name="Default">
          <Grower>
            <ConnectWorkspace />
          </Grower>
        </Variant>
      </ComponentType>
      <ComponentType name="NewWorkspace">
        <Variant name="Default">
          <Grower>
            <NewWorkspace />
          </Grower>
        </Variant>
      </ComponentType>
      <ComponentType name="FormTest">
        <Variant name="Default">
          <Grower>
            <FormTest />
          </Grower>
        </Variant>
      </ComponentType>
      <ComponentType name="LogsEmptyLoadingIndicator">
        <Variant name="Default">
          <Grower>
            <LogsEmptyLoadingIndicator />
          </Grower>
        </Variant>
      </ComponentType>
      <ComponentType name="LogsHeader">
        <Variant name="Default">
          <Grower>
            <LogsHeader
              handler="packages/functions/src/events/app-stage-updated.handler"
              construct="EventBus"
              constructName="bus"
              event="subscription"
              route="/replicache/push"
            />
          </Grower>
        </Variant>
      </ComponentType>
      <ComponentType name="Button">
        <Variant name="Primary">
          <Button color="primary">Button</Button>
          <Button data-state-hover color="primary">
            Button
          </Button>
          <Button data-state-active color="primary">
            Button
          </Button>
          <Button disabled color="primary">
            Button
          </Button>
        </Variant>
        <Variant name="Danger">
          <Button color="danger">Button</Button>
          <Button data-state-hover color="danger">
            Button
          </Button>
          <Button data-state-active color="danger">
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
          <Button data-state-active color="secondary">
            Button
          </Button>
          <Button disabled color="secondary">
            Button
          </Button>
        </Variant>
      </ComponentType>
      <ComponentType name="Tag">
        <Variant name="Solid">
          <Tag style="solid" level="info">
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
          <Tag style="outline" level="danger">
            Tag
          </Tag>
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
            <Row shrink={false} space="1">
              <span>11.2 MB</span>
              <span>us-east-1</span>
            </Row>
          </Row>
        </Variant>
      </ComponentType>
    </>
  );
}

const LogLoadingIndicator = styled("div", {
  base: {
    ...utility.row(1.5),
    alignItems: "center",
    padding: `${theme.space[2.5]} ${theme.space[1.5]}`,
    borderTop: `1px solid ${theme.color.divider.base}`,
    borderRadius: `0 0 ${theme.borderRadius} ${theme.borderRadius}`,
  },
  variants: {
    border: {
      true: {},
      false: {
        borderTopWidth: 0,
      },
    },
  },
  defaultVariants: {
    border: false,
  },
});

const LogLoadingIndicatorIcon = styled("div", {
  base: {
    width: 15,
    height: 15,
    color: theme.color.text.dimmed,
    opacity: theme.iconOpacity,
    animation: "pulse 1.5s linear infinite",
  },
});

const LogLoadingIndicatorCopy = styled("div", {
  base: {
    color: theme.color.text.dimmed,
    fontSize: "0.8125rem",
  },
});

const BackButton = styled("button", {
  base: {
    border: "none",
    background: "none",
    color: theme.color.text.dimmed,
    opacity: theme.iconOpacity,
    width: 42,
    height: 42,
    lineHeight: 0,
    padding: `0 ${theme.space[2]} 0 0`,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    selectors: {
      "&:hover": {
        color: theme.color.text.secondary,
      },
    },
  },
});

const BackButtonIcon = styled(IconChevronLeft, {
  base: {},
});

function Back() {
  return (
    <BackButton>
      <BackButtonIcon />
    </BackButton>
  );
}

const LogsHeaderTitle = styled("h1", {
  base: {
    fontSize: "1.25rem",
    fontWeight: 500,
  },
});

const ConstructIcon = styled("div", {
  base: {
    flex: "0 0 auto",
    color: theme.color.icon.secondary,
    width: 13,
    height: 13,
  },
});

const ConstructName = styled("div", {
  base: {
    fontSize: "0.8125rem",
    color: theme.color.text.secondary,
  },
});

const EventRoute = styled("div", {
  base: {
    fontSize: "0.75rem",
    color: theme.color.text.secondary,
    fontFamily: theme.font.family.code,
  },
});

interface LogsHeaderProps {
  handler: string;
  construct: string;
  constructName: string;
  event: string;
  route?: string;
}
function LogsHeader(props: LogsHeaderProps) {
  return (
    <Row space="0" vertical="center">
      <Back />
      <Stack space="2">
        <LogsHeaderTitle>{props.handler}</LogsHeaderTitle>
        <Row space="3.5" vertical="center">
          <Tag style="outline">{props.event}</Tag>
          <Row title={props.construct} space="1.5" vertical="center">
            <ConstructIcon>
              <IconEventBus />
            </ConstructIcon>
            <ConstructName>{props.constructName}</ConstructName>
          </Row>
          <EventRoute>{props.route}</EventRoute>
        </Row>
      </Stack>
    </Row>
  );
}

const LogsEmptyContainer = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 300,
    borderRadius: theme.borderRadius,
    border: `1px solid ${theme.color.divider.base}`,
  },
});

function LogsEmptyLoadingIndicator() {
  return (
    <LogsEmptyContainer>
      <LogLoadingIndicator>
        <LogLoadingIndicatorIcon>
          <IconBoltSolid />
        </LogLoadingIndicatorIcon>
        <LogLoadingIndicatorCopy>Tailing logs&hellip;</LogLoadingIndicatorCopy>
      </LogLoadingIndicator>
    </LogsEmptyContainer>
  );
}

const LinkButton = styled("span", {
  base: {
    fontWeight: 500,
    fontSize: theme.font.size.mono_sm,
    fontFamily: theme.font.family.code,
    color: theme.color.link.primary.base,
    transition: `color ${theme.colorFadeDuration} ease-out`,
    ":hover": {
      color: theme.color.link.primary.hover,
    },
  },
});

const inputStyles: CSSProperties = {
  border: "none",
  lineHeight: theme.font.lineHeight,
  appearance: "none",
  fontSize: theme.font.size.sm,
  borderRadius: theme.borderRadius,
  padding: `${theme.space[2]} ${theme.space[3]}`,
  backgroundColor: theme.color.input.background,
  transition: `box-shadow ${theme.colorFadeDuration} ease-out`,
  boxShadow: `
    0 0 0 1px inset ${theme.color.input.border},
    ${theme.color.input.shadow}
  `,
};

const inputDisabledStyles: CSSProperties = {
  opacity: 0.5,
  backgroundColor: theme.color.background.surface,
  color: theme.color.text.dimmed,
  cursor: "default",
  boxShadow: `0 0 0 1px inset ${theme.color.input.border}`,
};

const inputFocusStyles: CSSProperties = {
  boxShadow: `
    0 0 1px 1px inset hsla(${theme.color.blue.d1}, 100%),
    ${theme.color.input.shadow}
  `,
};

const inputDangerFocusStyles: CSSProperties = {
  color: `hsla(${theme.color.red.d2}, 100%)`,
  boxShadow: `
    0 0 1px 1px inset hsla(${theme.color.red.l2}, 100%),
    ${theme.color.input.shadow}
  `,
};

const Input = styled("input", {
  base: {
    ...inputStyles,
    ":focus": {
      ...inputFocusStyles,
    },
    ":disabled": {
      ...inputDisabledStyles,
    },
  },
  variants: {
    color: {
      primary: {},
      danger: {
        ...inputDangerFocusStyles,
        ":focus": {
          ...inputDangerFocusStyles,
        },
      },
    },
  },
  defaultVariants: {
    color: "primary",
  },
});

const Textarea = styled("textarea", {
  base: {
    ...inputStyles,
    height: "auto",
    ":focus": {
      ...inputFocusStyles,
    },
    ":disabled": {
      ...inputDisabledStyles,
    },
  },
  variants: {
    color: {
      primary: {},
      danger: {
        ...inputDangerFocusStyles,
        ":focus": {
          ...inputDangerFocusStyles,
        },
      },
    },
  },
  defaultVariants: {
    color: "primary",
  },
});

const chevronDownString = `
  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'>
    <path stroke='#767681' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/>
  </svg>
`;

const Select = styled("select", {
  base: {
    ...inputStyles,
    backgroundRepeat: "no-repeat",
    backgroundSize: "1.25rem 1.25rem",
    backgroundPosition: "bottom 50% right 0.5rem",
    backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
      chevronDownString
    )}")`,
    paddingRight: theme.space[10],
    ":focus": {
      ...inputFocusStyles,
    },
    ":invalid": {
      color: theme.color.text.dimmed,
    },
    ":disabled": {
      ...inputDisabledStyles,
    },
  },
  variants: {
    color: {
      primary: {},
      danger: {
        ...inputDangerFocusStyles,
        ":focus": {
          ...inputDangerFocusStyles,
        },
      },
    },
  },
  defaultVariants: {
    color: "primary",
  },
});

const FormField = styled("label", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: theme.space[3],
  },
});

const Label = styled("p", {
  base: {
    fontWeight: 500,
    letterSpacing: 0.5,
    fontSize: theme.font.size.mono_sm,
    textTransform: "uppercase",
    fontFamily: theme.font.family.heading,
  },
});

const FormFieldHint = styled("p", {
  base: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.dimmed,
  },
  variants: {
    color: {
      primary: {},
      danger: {
        color: `hsla(${theme.color.red.l2}, 100%)`,
      },
    },
  },
  defaultVariants: {
    color: "primary",
  },
});

const NewWorkspaceHeader = styled("h1", {
  base: {
    fontSize: theme.font.size.lg,
    fontWeight: 500,
  },
});

const NewWorkspaceDesc = styled("p", {
  base: {
    color: theme.color.text.secondary,
  },
});

const FormNewWorkspace = styled("form", {
  base: {
    ...utility.stack(5),
    alignItems: "stretch",
    margin: "0 auto",
    maxWidth: 600,
  },
});

function NewWorkspace() {
  return (
    <Stack space="8">
      <Stack horizontal="center" space="5">
        <WorkspaceIcon text="acme" />
        <Stack horizontal="center" space="2">
          <NewWorkspaceHeader>Create a new workspace</NewWorkspaceHeader>
          <NewWorkspaceDesc>
            Start by giving your workspace a name
          </NewWorkspaceDesc>
        </Stack>
      </Stack>
      <FormNewWorkspace>
        <Stack space="2.5">
          <FormField>
            <Input placeholder="acme" type="text" />
          </FormField>
          <FormFieldHint>
            Needs to be lowercase, unique, and URL friendly.
          </FormFieldHint>
        </Stack>
        <Button color="primary">Create Workspace</Button>
      </FormNewWorkspace>
    </Stack>
  );
}

const ConnectWorkspaceHeader = styled("h1", {
  base: {
    fontSize: theme.font.size.lg,
    fontWeight: 500,
  },
  variants: {
    loading: {
      true: {
        color: theme.color.text.secondary,
      },
      false: {},
    },
  },
  defaultVariants: {
    loading: false,
  },
});

const ConnectWorkspaceList = styled("div", {
  base: {
    border: `1px solid ${theme.color.divider.base}`,
    borderRadius: theme.borderRadius,
  },
});

const ConnectWorkspaceRow = styled("a", {
  base: {
    ...utility.row(2),
    padding: `${theme.space[3]} ${theme.space[3]}`,
    width: 320,
    alignItems: "center",
    color: theme.color.text.secondary,
    lineHeight: "normal",
    borderTop: `1px solid ${theme.color.divider.base}`,
    ":hover": {
      color: theme.color.text.primary.surface,
      backgroundColor: theme.color.background.surface,
    },
    selectors: {
      "&:first-child": {
        borderTop: "none",
      },
    },
  },
});

const ConnectWorkspaceName = styled("span", {
  base: {
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
});

const ConnectWorkspaceIcon = styled("div", {
  base: {
    width: 24,
    height: 24,
    color: theme.color.text.secondary,
    opacity: theme.iconOpacity,
    animation: "spin 1.5s linear infinite",
  },
});

globalKeyframes("spin", {
  from: {
    transform: "rotate(0deg)",
  },
  to: {
    transform: "rotate(360deg)",
  },
});

function ConnectWorkspace() {
  const list = [
    "acme",
    "krusty-krab",
    "chum-bucket",
    "some-really-long-workspace-name",
  ];
  return (
    <Stack horizontal="center" space="5">
      <ConnectWorkspaceHeader>Connect to a workspace</ConnectWorkspaceHeader>
      <ConnectWorkspaceList>
        <For each={list}>
          {(item: string) => (
            <ConnectWorkspaceRow href="#">
              <WorkspaceIcon text={item} />
              <ConnectWorkspaceName>{item}</ConnectWorkspaceName>
            </ConnectWorkspaceRow>
          )}
        </For>
      </ConnectWorkspaceList>
    </Stack>
  );
}

function ConnectingWorkspace() {
  return (
    <Stack horizontal="center" space="5">
      <ConnectWorkspaceIcon>
        <IconArrowPath />
      </ConnectWorkspaceIcon>
      <Stack horizontal="center" space="3">
        <ConnectWorkspaceHeader loading>
          Connecting to workspace&hellip;
        </ConnectWorkspaceHeader>
        <ConnectWorkspaceList>
          <ConnectWorkspaceRow href="#">
            <WorkspaceIcon text="krusty-krab" />
            <ConnectWorkspaceName>krusty-krab</ConnectWorkspaceName>
          </ConnectWorkspaceRow>
        </ConnectWorkspaceList>
      </Stack>
    </Stack>
  );
}

function FormTest() {
  return (
    <form>
      <Stack space="7">
        <FormField>
          <Label>Workspace Name</Label>
          <Input placeholder="Acme Inc." type="text" />
        </FormField>
        <FormField>
          <Label>Workspace Name</Label>
          <Input
            disabled
            value="Acme Inc."
            placeholder="Acme Inc."
            type="text"
          />
        </FormField>
        <FormField>
          <Label>Workspace Description</Label>
          <Textarea placeholder="Acme Inc." />
        </FormField>
        <FormField>
          <Label>Workspace Description</Label>
          <Textarea disabled placeholder="Acme Inc." />
        </FormField>
        <Stack space="2.5">
          <FormField>
            <Label>Workspace Description</Label>
            <Textarea color="danger" placeholder="Acme Inc.">
              Invalid Description
            </Textarea>
          </FormField>
          <FormFieldHint color="danger">
            Needs to be lowercase, unique, and URL friendly.
          </FormFieldHint>
        </Stack>
        <Stack space="2.5">
          <FormField>
            <Label>Workspace Slug</Label>
            <Input placeholder="acme" type="text" />
          </FormField>
          <FormFieldHint>
            Needs to be lowercase, unique, and URL friendly.
          </FormFieldHint>
        </Stack>
        <Stack space="2.5">
          <FormField>
            <Label>Workspace Slug</Label>
            <Input
              type="text"
              color="danger"
              placeholder="acme"
              value="Invalid Value"
            />
          </FormField>
          <FormFieldHint color="danger">
            Needs to be lowercase, unique, and URL friendly.
          </FormFieldHint>
        </Stack>
        <FormField>
          <Label>Workspace</Label>
          <Select required>
            <option value="" disabled selected hidden>
              Select your workspace
            </option>
            <option>acme</option>
            <option>acme-2</option>
            <option>acme-3</option>
          </Select>
        </FormField>
        <FormField>
          <Label>Workspace</Label>
          <Select required disabled>
            <option value="" disabled selected hidden>
              Select your workspace
            </option>
            <option>acme</option>
            <option>acme-2</option>
            <option>acme-3</option>
          </Select>
        </FormField>
        <Stack space="2.5">
          <FormField>
            <Label>Workspace</Label>
            <Select color="danger">
              <option>No workspace available</option>
            </Select>
          </FormField>
          <FormFieldHint color="danger">
            You need to create a workspace to get started.
          </FormFieldHint>
        </Stack>
        <Row space="5" vertical="center" horizontal="end">
          <LinkButton>Cancel</LinkButton>
          <Button color="primary">Create Workspace</Button>
        </Row>
      </Stack>
    </form>
  );
}
