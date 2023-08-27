import { globalStyle, globalKeyframes, CSSProperties } from "@macaron-css/core";
import { SpanSpacer, Grower, Stack, Row, Hr } from "$/ui/layout";
import { styled } from "@macaron-css/solid";
import { theme } from "$/ui/theme";
import {
  IconTrash,
  IconXMark,
  IconBookmark,
  IconBoltSolid,
  IconChevronLeft,
  IconChevronDown,
  IconChevronRight,
  IconExclamationTriangle,
} from "$/ui/icons";
import { Text } from "$/ui/text";
import { FormInput } from "$/ui/form";
import { Tag } from "$/ui/tag";
import { Alert } from "$/ui/alert";
import { Dropdown } from "$/ui/dropdown";
import { IconButton, TextButton, Button, LinkButton } from "$/ui/button";
import { utility } from "$/ui/utility";
import {
  IconApi,
  IconApp,
  IconFunction,
  IconCron,
  IconAuth,
  IconConfig,
  IconEventBus,
  IconGitHub,
  IconRDS,
  IconBucket,
  IconArrowPathSpin,
} from "$/ui/icons/custom";
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
      <ComponentType name="Stack Trace">
        <Variant name="Node.js">
          <Grower>
            <ErrorDetails>
              <ErrorDetailsTitle>
                NoSuchKey: The specified key does not exist.
              </ErrorDetailsTitle>
              <StackTrace
                expanded={true}
                isAppCode={true}
                fn="Object.use"
                file="packages/functions/src/events/aws-account-created.mjs"
                line={123}
                column={4}
                context={[
                  {
                    number: 99,
                    code: "    id: true,",
                  },
                  {
                    number: 100,
                    code: "    executionARN: true,",
                  },
                  {
                    number: 101,
                    code: "  }),",
                  },
                  {
                    number: 102,
                    code: "  async (input) =>",
                    highlight: true,
                  },
                  {
                    number: 103,
                    code: "    useTransaction((tx) =>",
                  },
                  {
                    number: 104,
                    code: "      tx",
                  },
                  {
                    number: 105,
                    code: "        .update(log_poller)",
                  },
                  {
                    number: 106,
                    code: '        .where(and(eq(log_poller.id, id), eq(log_poller.workspaceID, useWorkspace())), "this-is-a-very-long-string-that-should-wrap-around-thestagenameisreallylonganditwillcausethelinetooverflow"),)',
                  },
                ]}
              />
              <StackTrace
                expanded={false}
                isAppCode={true}
                fn="createTransactionEffect"
                file="packages/functions/src/events/aws-account-created.mjs"
                line={919}
                column={48}
              />
              <StackTrace
                expanded={false}
                isAppCode={false}
                file="node:internal/process/task_queues"
                line={96}
                column={5}
              />
              <StackTrace
                expanded={false}
                isAppCode={false}
                fn="runMicrotasks"
                file="<anonymous>"
              />
              <StackTrace
                expanded={false}
                isAppCode={true}
                file="packages/functions/src/events/aws-account-created.mjs"
                line={779}
                column={6}
              />
              <StackTrace
                expanded={false}
                isAppCode={true}
                fn="async db.transaction.isolationLevel"
                file="packages/functions/src/events/aws-account-created.mjs"
                line={391}
                column={21}
              />
              <StackTrace
                expanded={false}
                isAppCode={true}
                fn="async db.transaction.isolationLevel.readCommitted.readWrite.execute"
                file="packages/functions/src/events/really-really-long-file-path-that-should-overflow/aws-account-created.mjs"
                line={391}
                column={21}
              />
              <ErrorDetailsTitle>
                ValidationError: Session not found
              </ErrorDetailsTitle>
              <StackTrace
                expanded={false}
                isAppCode={true}
                fn="createTransactionEffect"
                file="packages/functions/src/events/aws-account-created.mjs"
                line={919}
                column={48}
              />
              <StackTrace
                expanded={false}
                isAppCode={false}
                file="node:internal/process/task_queues"
                line={96}
                column={5}
              />
              <StackTrace
                expanded={false}
                isAppCode={false}
                fn="runMicrotasks"
                file="<anonymous>"
              />
              <StackTrace
                expanded={false}
                isAppCode={true}
                file="packages/functions/src/events/aws-account-created.mjs"
                line={779}
                column={6}
              />
              <StackTrace
                expanded={false}
                isAppCode={true}
                fn="async db.transaction.isolationLevel"
                file="packages/functions/src/events/aws-account-created.mjs"
                line={391}
                column={21}
              />
              <StackTrace
                expanded={false}
                isAppCode={true}
                fn="async db.transaction.isolationLevel.readCommitted.readWrite.execute"
                file="packages/functions/src/events/really-really-long-file-path-that-should-overflow/aws-account-created.mjs"
                line={391}
                column={21}
              />
            </ErrorDetails>
          </Grower>
        </Variant>
        <Variant name="Other">
          <Grower>
            <ErrorDetails>
              <ErrorDetailsTitle>
                ValidationError: Session not found
              </ErrorDetailsTitle>
              <StackTrace raw="at Object.use (file:///var/task/packages/functions/src/events/aws-account-created.mjs:27672:17)" />
              <StackTrace raw="at createTransactionEffect (file:///var/task/packages/functions/src/events/aws-account-created.mjs:47186:42)" />
              <StackTrace raw="at file:///var/task/packages/functions/src/events/aws-account-created.mjs:94005:7" />
              <StackTrace raw="at runMicrotasks (<anonymous>)" />
              <StackTrace raw="at async db.transaction.isolationLevel.readCommitted.readWrite.execute (packages/functions/src/events/really-really-long-file-path-that-should-overflow/aws-account-created.mjs:96:5)" />
            </ErrorDetails>
          </Grower>
        </Variant>
      </ComponentType>
      <ComponentType name="Accounts">
        <Variant name="Default">
          <Grower>
            <Accounts />
          </Grower>
        </Variant>
      </ComponentType>
      <ComponentType name="Login">
        <Variant name="Default">
          <Grower>
            <Login />
          </Grower>
        </Variant>
      </ComponentType>
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
      <ComponentType name="FormTest">
        <Variant name="Default">
          <Grower>
            <FormTest />
          </Grower>
        </Variant>
      </ComponentType>
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
          <Button data-state-active color="github">
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
      <ComponentType name="Alert">
        <Variant name="Info">
          <Grower>
            <Alert level="info">
              This is an info alert. You don't need to take it very seriously.
              But it is a long info alert that will overflow. And we want to
              test how long it can really get. So here is some more text.
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

const StackTraceRoot = styled("div", {
  base: {
    ...utility.stack(0),
    flex: "1 1 auto",
    borderTop: `1px solid ${theme.color.divider.surface}`,
  },
});

const StackTraceExpandIcon = styled("div", {
  base: {
    flex: "0 0 auto",
    marginTop: 5,
    width: 12,
    height: 12,
    textAlign: "center",
    opacity: theme.iconOpacity,
    color: theme.color.text.primary.surface,
    lineHeight: theme.font.lineHeight,
  },
});

const StackTraceContent = styled("div", {
  base: {
    ...utility.row(2),
    padding: `0 ${theme.space[5]}`,
  },
  variants: {
    dimmed: {
      true: {
        opacity: 0.4,
      },
      false: {},
    },
  },
  defaultVariants: {
    dimmed: false,
  },
});

const StackTraceSummary = styled("div", {
  base: {
    padding: `${theme.space[1]} 0`,
    lineHeight: theme.font.lineHeight,
  },
});

const StackTraceContext = styled("div", {
  base: {
    marginLeft: theme.space[5],
    padding: `${theme.space[1]} ${theme.space[5]} ${theme.space[1]} 0`,
    borderTop: `1px solid ${theme.color.divider.surface}`,
  },
});

const StackTraceContextRow = styled("div", {
  base: {
    ...utility.row(0),
    alignItems: "flex-start",
    padding: `${theme.space[0.5]} 0`,
  },
});

const StackTraceContextLineNumber = styled("div", {
  base: {
    flex: "0 0 auto",
    minWidth: 32,
  },
});

interface CodeLine {
  number: number;
  code: string;
  highlight?: boolean;
}

interface StackTraceProps {
  fn?: string;
  raw?: string;
  file?: string;
  line?: number;
  column?: number;
  expanded?: boolean;
  isAppCode?: boolean;
  context?: CodeLine[];
}

function StackTrace({
  fn,
  raw,
  file,
  line,
  column,
  context,
  expanded = false,
  isAppCode = true,
}: StackTraceProps) {
  return (
    <StackTraceRoot>
      <StackTraceContent dimmed={!raw && !isAppCode}>
        <StackTraceExpandIcon>
          <Show when={!raw}>
            <Show when={expanded}>
              <IconChevronDown width="12" height="12" />
            </Show>
            <Show when={!expanded}>
              <IconChevronRight width="12" height="12" />
            </Show>
          </Show>
        </StackTraceExpandIcon>
        <StackTraceSummary>
          <Show when={raw}>
            <Text
              code
              leading="loose"
              color="primary"
              on="surface"
              size="mono_sm"
            >
              {raw}
            </Text>
          </Show>
          <Show when={!raw}>
            <Show when={fn}>
              <Text
                code
                on="surface"
                size="mono_sm"
                color="primary"
                leading="normal"
                weight={expanded ? "semibold" : "regular"}
              >
                {fn}
              </Text>
              <SpanSpacer space="3" />
            </Show>
            <span>
              <Text
                code
                on="surface"
                size="mono_sm"
                color="primary"
                leading="normal"
                weight={
                  fn
                    ? expanded
                      ? "medium"
                      : "regular"
                    : expanded
                    ? "semibold"
                    : "regular"
                }
              >
                {file}
              </Text>
              <Show when={line && column}>
                <SpanSpacer space="2" />
                <Text
                  code
                  leading="normal"
                  on="surface"
                  color="secondary"
                  size="mono_sm"
                >
                  {line}
                </Text>
                <Text
                  code
                  leading="normal"
                  on="surface"
                  color="dimmed"
                  size="mono_sm"
                >
                  :
                </Text>
                <Text
                  code
                  leading="normal"
                  on="surface"
                  color="secondary"
                  size="mono_sm"
                >
                  {column}
                </Text>
              </Show>
            </span>
          </Show>
        </StackTraceSummary>
      </StackTraceContent>
      <Show when={expanded && context && context.length > 0}>
        <StackTraceContext>
          <For each={context}>
            {({ number, code, highlight }) => (
              <StackTraceContextRow>
                <StackTraceContextLineNumber>
                  <Text
                    code
                    on="surface"
                    size="mono_xs"
                    leading="loose"
                    color={highlight ? "primary" : "dimmed"}
                    weight={highlight ? "semibold" : "regular"}
                  >
                    {number}
                  </Text>
                </StackTraceContextLineNumber>
                <Text
                  code
                  on="surface"
                  size="mono_xs"
                  leading="loose"
                  color={highlight ? "primary" : "secondary"}
                  weight={highlight ? "medium" : "regular"}
                >
                  <pre
                    style={{
                      "white-space": "pre-wrap",
                      "word-break": "break-word",
                    }}
                  >
                    {code}
                  </pre>
                </Text>
              </StackTraceContextRow>
            )}
          </For>
        </StackTraceContext>
      </Show>
    </StackTraceRoot>
  );
}

const ErrorDetailsRoot = styled("div", {
  base: {
    ...utility.stack(0),
    paddingBottom: theme.space[2],
    borderRadius: theme.borderRadius,
    backgroundColor: theme.color.background.surface,
  },
});

const ErrorDetailsTitleRoot = styled("div", {
  base: {
    borderTop: `1px solid ${theme.color.divider.surface}`,
    padding: `${theme.space[4]} ${theme.space[5]} ${theme.space[3.5]}`,
    selectors: {
      "&:first-child": {
        borderTop: "none",
      },
    },
  },
});

function ErrorDetailsTitle(
  props: ComponentProps<typeof ErrorDetailsTitleRoot>
) {
  return (
    <ErrorDetailsTitleRoot>
      <Text code weight="medium" size="mono_base" on="surface" color="danger">
        {props.children}
      </Text>
    </ErrorDetailsTitleRoot>
  );
}

function ErrorDetails(props: ComponentProps<typeof ErrorDetailsRoot>) {
  return (
    <ErrorDetailsRoot>
      <Stack space="0.5">{props.children}</Stack>
    </ErrorDetailsRoot>
  );
}

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
  color: theme.color.text.dimmed.base,
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
      color: theme.color.text.dimmed.base,
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
    color: theme.color.text.dimmed.base,
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

const AccountsHeader = styled("div", {
  base: {
    ...utility.row(2),
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

const AccountsList = styled("div", {
  base: {
    ...utility.row(4),
    width: "100%",
  },
});

const AccountsListCol = styled("div", {
  base: {
    ...utility.stack(4),
    flex: 1,
    width: "50%",
  },
});

const AccountCard = styled("div", {
  base: {
    borderRadius: theme.borderRadius,
    border: `1px solid ${theme.color.divider.base}`,
  },
});

const AccountCardHeader = styled("div", {
  base: {
    ...utility.row(0.5),
    alignItems: "center",
    padding: theme.space[4],
    borderBottom: `1px solid ${theme.color.divider.base}`,
  },
});

const Stage = styled("div", {
  base: {
    ...utility.row(2),
    alignItems: "center",
    padding: theme.space[4],
    justifyContent: "space-between",
    borderTop: `1px solid ${theme.color.divider.base}`,
    transition: `background-color ${theme.colorFadeDuration} ease`,
    ":hover": {
      backgroundColor: theme.color.background.hover,
    },
    selectors: {
      "&:first-child": {
        borderTop: "none",
      },
    },
  },
});

const StageIcon = styled("div", {
  base: {
    flex: "0 0 auto",
    width: 16,
    height: 16,
    color: theme.color.icon.secondary,
  },
});

const AccountCardLoading = styled("div", {
  base: {
    ...utility.row(2),
    alignItems: "center",
    padding: theme.space[4],
    borderTop: `1px solid ${theme.color.divider.base}`,
    selectors: {
      "&:first-child": {
        borderTop: "none",
      },
    },
  },
});

const AccountCardLoadingIcon = styled("div", {
  base: {
    width: 16,
    height: 16,
    color: theme.color.icon.dimmed,
  },
});

const StageCardTags = styled("div", {
  base: {
    ...utility.row(3),
    alignItems: "center",
    flex: "0 0 auto",
  },
});

interface StageCardProps {
  app: string;
  stage: string;
  region: string;
  local?: boolean;
}
function StageCard({ app, stage, region, local }: StageCardProps) {
  return (
    <Stage>
      <Row space="2" vertical="center">
        <StageIcon>
          <IconApp />
        </StageIcon>
        <Row space="1">
          <Text line size="base" weight="medium" leading="normal">
            {app}
          </Text>
          <Text size="base" color="dimmed">
            /
          </Text>
          <Text line size="base" weight="medium" leading="normal">
            {stage}
          </Text>
        </Row>
      </Row>
      <StageCardTags>
        <Show when={local}>
          <Tag level="tip" style="outline">
            Local
          </Tag>
        </Show>
        <Tag style="outline">{region}</Tag>
      </StageCardTags>
    </Stage>
  );
}

function AccountCardLoadingRow() {
  return (
    <AccountCardLoading>
      <AccountCardLoadingIcon>
        <IconArrowPathSpin />
      </AccountCardLoadingIcon>
      <Text size="sm" color="dimmed">
        Seaching for SST apps&hellip;
      </Text>
    </AccountCardLoading>
  );
}

function AccountCardEmptyRow() {
  return (
    <AccountCardLoading>
      <AccountCardLoadingIcon>
        <IconExclamationTriangle />
      </AccountCardLoadingIcon>
      <Text size="sm" color="dimmed">
        No SST apps found
      </Text>
    </AccountCardLoading>
  );
}

function Accounts() {
  return (
    <Stack space="4">
      <AccountsHeader>
        <Text size="lg" weight="medium">
          Overview
        </Text>
        <Button color="secondary">Add AWS Account</Button>
      </AccountsHeader>
      <AccountsList>
        <AccountsListCol>
          <AccountCard>
            <AccountCardHeader>
              <Text code size="mono_sm" color="dimmed">
                ID:
              </Text>
              <Text code size="mono_sm" color="dimmed">
                298831414690
              </Text>
            </AccountCardHeader>
            <div>
              <StageCard app="console" stage="dev" region="us-east-2" />
              <StageCard app="my-sst-app" stage="dev" region="eu-central-2" />
            </div>
          </AccountCard>
          <AccountCard>
            <AccountCardHeader>
              <Text code size="mono_sm" color="dimmed">
                ID:
              </Text>
              <Text code size="mono_sm" color="dimmed">
                730131414690
              </Text>
            </AccountCardHeader>
            <div>
              <AccountCardLoadingRow />
            </div>
          </AccountCard>
          <AccountCard>
            <AccountCardHeader>
              <Text code size="mono_sm" color="dimmed">
                ID:
              </Text>
              <Text code size="mono_sm" color="dimmed">
                444131414690
              </Text>
            </AccountCardHeader>
            <div>
              <StageCard app="console" stage="frank" region="us-east-1" />
              <AccountCardLoadingRow />
            </div>
          </AccountCard>
        </AccountsListCol>
        <AccountsListCol>
          <AccountCard>
            <AccountCardHeader>
              <Text code size="mono_sm" color="dimmed">
                ID:
              </Text>
              <Text code size="mono_sm" color="dimmed">
                373331414690
              </Text>
            </AccountCardHeader>
            <div>
              <StageCard app="console" stage="prod" region="ap-southeast-1" />
              <StageCard app="my-sst-app" stage="prod" region="us-east-1" />
              <StageCard
                local
                app="my-sst-app-has-a-really-long-app-name-that-should-overflow"
                stage="prod"
                region="us-east-1"
              />
              <StageCard
                app="my-sst-app"
                stage="thestagenameisreallylonganditwillcausethelinetooverflow"
                region="us-east-1"
              />
            </div>
          </AccountCard>
          <AccountCard>
            <AccountCardHeader>
              <Text code size="mono_sm" color="dimmed">
                ID:
              </Text>
              <Text code size="mono_sm" color="dimmed">
                730131414690
              </Text>
            </AccountCardHeader>
            <div>
              <AccountCardEmptyRow />
            </div>
          </AccountCard>
        </AccountsListCol>
      </AccountsList>
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
        color: theme.color.text.secondary.base,
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
    color: theme.color.text.secondary.base,
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
    color: theme.color.text.secondary.base,
    opacity: theme.iconOpacity,
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
              <AvatarInitialsIcon type="workspace" text={item} />
              <ConnectWorkspaceName>{item}</ConnectWorkspaceName>
            </ConnectWorkspaceRow>
          )}
        </For>
      </ConnectWorkspaceList>
    </Stack>
  );
}

const LoginContainer = styled("div", {
  base: {
    ...utility.stack(8),
    alignItems: "center",
    margin: "0 auto",
    width: 320,
  },
});

const LoginIcon = styled("div", {
  base: {
    width: 42,
    height: 42,
    color: theme.color.accent,
  },
});

const LoginHeader = styled("h1", {
  base: {
    fontSize: theme.font.size.lg,
    fontWeight: 500,
  },
});

const LoginDesc = styled("p", {
  base: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary.base,
  },
});

function Login() {
  return (
    <LoginContainer>
      <Stack horizontal="center" space="5">
        <LoginIcon>
          <IconApp />
        </LoginIcon>
        <Stack horizontal="center" space="2">
          <LoginHeader>Welcome to the SST Console</LoginHeader>
          <LoginDesc>Log in with your GitHub to get started</LoginDesc>
        </Stack>
      </Stack>
      <Button color="github">
        <ButtonIcon>
          <IconGitHub />
        </ButtonIcon>
        Login with GitHub
      </Button>
    </LoginContainer>
  );
}

const FakeModal = styled("form", {
  base: {
    borderRadius: 10,
    flexShrink: 0,
    boxShadow: theme.color.shadow.drop.long,
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    background: theme.color.background.modal,
  },
});

const UnsupportedAppRoot = styled("div", {
  base: {
    ...utility.stack(8),
    alignItems: "center",
    margin: "0 auto",
    width: 320,
  },
});

const UnsupportedAppIcon = styled("div", {
  base: {
    width: 42,
    height: 42,
    color: theme.color.icon.dimmed,
  },
});

function UnsupportedApp() {
  return (
    <UnsupportedAppRoot>
      <Stack horizontal="center" space="5">
        <UnsupportedAppIcon>
          <IconExclamationTriangle />
        </UnsupportedAppIcon>
        <Stack horizontal="center" space="2">
          <Text size="lg" weight="medium">
            Unsupported SST version
          </Text>
          <Text center size="sm" color="secondary">
            To use the SST Console,{" "}
            <a target="_blank" href="https://github.com/sst/sst/releases">
              upgrade to v2.19.0
            </a>
          </Text>
        </Stack>
      </Stack>
    </UnsupportedAppRoot>
  );
}

function ConnectingWorkspace() {
  return (
    <Stack horizontal="center" space="5">
      <ConnectWorkspaceIcon>
        <IconArrowPathSpin />
      </ConnectWorkspaceIcon>
      <Stack horizontal="center" space="3">
        <ConnectWorkspaceHeader loading>
          Connecting to workspace&hellip;
        </ConnectWorkspaceHeader>
        <ConnectWorkspaceList>
          <ConnectWorkspaceRow href="#">
            <AvatarInitialsIcon type="workspace" text="krusty-krab" />
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

const LoadingResourcesH1 = styled("h1", {
  base: {
    fontSize: theme.font.size.lg,
    fontWeight: 500,
    color: theme.color.text.dimmed.base,
  },
});

const LoadingResourcesIndicator = styled("div", {
  base: {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    borderRadius: theme.borderRadius,
    border: `1px solid ${theme.color.divider.base}`,
  },
});

const LoadingRow = styled("div", {
  base: {
    display: "inline-flex",
    alignItems: "center",
    borderTop: `1px solid ${theme.color.divider.base}`,
    selectors: {
      "&:first-child": {
        borderTopWidth: 0,
      },
    },
  },
});

const LoadingIcon = styled("div", {
  base: {
    borderRight: `1px solid ${theme.color.divider.base}`,
    padding: 30,
    width: 96,
    height: 96,
    color: theme.color.icon.dimmed,
    selectors: {
      "&:last-child": {
        borderRightWidth: 0,
      },
    },
  },
});

const opacity = 0.3;
const timing = "ease-out";

globalKeyframes("pulse33", {
  "0%": {
    opacity,
  },
  "16.66%": {
    opacity: 1,
  },
  "33.32%": {
    opacity,
  },
});

function LoadingResources() {
  return (
    <Stack space="5" horizontal="center">
      <LoadingResourcesH1>Syncing resources&hellip;</LoadingResourcesH1>
      <LoadingResourcesIndicator>
        <LoadingRow>
          <LoadingIcon>
            <IconApi
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} infinite`,
              }}
            />
          </LoadingIcon>
          <LoadingIcon>
            <IconAuth
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} .5s infinite`,
              }}
            />
          </LoadingIcon>
          <LoadingIcon>
            <IconConfig
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} 1s infinite`,
              }}
            />
          </LoadingIcon>
        </LoadingRow>
        <LoadingRow>
          <LoadingIcon>
            <IconFunction
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} .5s infinite`,
              }}
            />
          </LoadingIcon>
          <LoadingIcon>
            <IconApp
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} 1s infinite`,
              }}
            />
          </LoadingIcon>
          <LoadingIcon>
            <IconEventBus
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} 1.5s infinite`,
              }}
            />
          </LoadingIcon>
        </LoadingRow>
        <LoadingRow>
          <LoadingIcon>
            <IconCron
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} 1s infinite`,
              }}
            />
          </LoadingIcon>
          <LoadingIcon>
            <IconBucket
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} 1.5s infinite`,
              }}
            />
          </LoadingIcon>
          <LoadingIcon>
            <IconRDS
              style={{
                opacity,
                animation: `pulse33 2.5s ${timing} 2s infinite`,
              }}
            />
          </LoadingIcon>
        </LoadingRow>
      </LoadingResourcesIndicator>
    </Stack>
  );
}
