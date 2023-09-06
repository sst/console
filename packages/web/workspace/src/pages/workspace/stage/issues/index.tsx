import { Match, Show, Switch } from "solid-js";
import { styled } from "@macaron-css/solid";
import { Row, Stack } from "$/ui/layout";
import { IconCheck, IconNoSymbol } from "$/ui/icons";
import { utility, Alert, TabTitle, Text, Button, ButtonGroup } from "$/ui";
import { formatNumber, formatSinceTime } from "$/common/format";
import { SplitOptions, SplitOptionsOption } from "$/ui/form";
import { Link } from "@solidjs/router";
import { theme } from "$/ui/theme";
import { PageHeader } from "../resources";

const COL_COUNT_WIDTH = 80;
const COL_TIME_WIDTH = 200;

const Content = styled("div", {
  base: {
    padding: theme.space[4],
  },
});

const IssuesHeader = styled("div", {
  base: {
    ...utility.row(4),
    height: 54,
    alignItems: "center",
    padding: theme.space[4],
    border: `1px solid ${theme.color.divider.base}`,
    backgroundColor: theme.color.background.surface,
    borderRadius: `${theme.borderRadius} ${theme.borderRadius} 0 0`,
  },
});

const IssueCol = styled("div", {
  base: {
    minWidth: 0,
  },
  variants: {
    grow: {
      true: {
        flex: "1 1 auto",
      },
      false: {
        flex: "0 0 auto",
      },
    },
    align: {
      left: {
        textAlign: "left",
        justifyContent: "flex-start",
      },
      right: {
        textAlign: "right",
        justifyContent: "flex-end",
      },
    },
  },
  defaultVariants: {
    grow: false,
    align: "left",
  },
});

const IssuesHeaderCol = styled(IssueCol, {
  base: {
    ...utility.row(3.5),
    alignItems: "center",
  },
});

const IssueActions = styled(ButtonGroup, {
  base: {},
  variants: {
    active: {
      true: {},
      false: {
        opacity: 0.6,
      },
    },
  },
  defaultVariants: {
    active: false,
  },
});

const ButtonIcon = styled("span", {
  base: {
    width: 12,
    height: 12,
    marginRight: 6,
    verticalAlign: -2,
    display: "inline-block",
    opacity: theme.iconOpacity,
  },
});

const IssuesList = styled("div", {
  base: {
    borderRadius: `0 0 ${theme.borderRadius} ${theme.borderRadius}`,
    borderStyle: "solid",
    borderWidth: "0 1px 1px 1px",
    borderColor: theme.color.divider.base,
  },
});

export function Issues() {
  return (
    <>
      <PageHeader
        right={
          <SplitOptions size="sm">
            <SplitOptionsOption selected>Active</SplitOptionsOption>
            <SplitOptionsOption>Ignored</SplitOptionsOption>
            <SplitOptionsOption>Resolved</SplitOptionsOption>
          </SplitOptions>
        }
      >
        <Link href="../">
          <TabTitle state="inactive">Resources</TabTitle>
        </Link>
        <TabTitle count="99+" state="active">
          Issues
        </TabTitle>
      </PageHeader>
      <Content>
        <Stack space="4">
          <Alert level="info">
            There was a problem enabling Issues for your account.{" "}
            <a href="htts://sst.dev/discord">Contact us on Discord.</a>
          </Alert>
          <div>
            <IssuesHeader>
              <IssuesHeaderCol>
                <input type="checkbox" />
              </IssuesHeaderCol>
              <IssuesHeaderCol grow>
                <Text
                  code
                  uppercase
                  on="surface"
                  size="mono_sm"
                  weight="medium"
                  color="dimmed"
                >
                  Error
                </Text>
                <IssueActions>
                  <Button size="sm" grouped="left" color="secondary">
                    <ButtonIcon>
                      <IconNoSymbol />
                    </ButtonIcon>
                    Ignore
                  </Button>
                  <Button size="sm" grouped="right" color="secondary">
                    <ButtonIcon>
                      <IconCheck />
                    </ButtonIcon>
                    Resolve
                  </Button>
                </IssueActions>
              </IssuesHeaderCol>
              <IssuesHeaderCol
                align="right"
                style={{ width: `${COL_COUNT_WIDTH}px` }}
                title="Number of events in the last 24 hours"
              >
                <Text
                  code
                  uppercase
                  on="surface"
                  size="mono_sm"
                  weight="medium"
                  color="dimmed"
                >
                  Last day
                </Text>
              </IssuesHeaderCol>
              <IssuesHeaderCol
                align="right"
                style={{ width: `${COL_TIME_WIDTH}px` }}
                title="Last and first occurrence of the error"
              >
                <Text
                  code
                  uppercase
                  on="surface"
                  size="mono_sm"
                  weight="medium"
                  color="dimmed"
                >
                  Time
                </Text>
              </IssuesHeaderCol>
            </IssuesHeader>
            <IssuesList>
              <Issue
                unread
                count={119}
                error="NoSuchBucket"
                message="The specified bucket does not exist."
                handler="/packages/functions/src/events/log-poller-status.handler"
                modifiedAt={new Date().getTime() - 1000 * 60 * 24 * 2}
                createdAt={1620000000000}
              />
              <Issue
                count={119}
                error="OperationAbortedException"
                message="A conflicting operation is currently in progress against this resource. Please try again."
                handler="/packages/functions/src/events/log-poller-status.handler"
                modifiedAt={new Date().getTime() - 1000 * 60 * 24 * 3}
                createdAt={1620000000000}
              />
              <Issue
                count={119}
                error="Lambda Runtime Error"
                message="console-Issues-issuessubscriberBB84DB60-ZZ1S7gCsh9QR exited with error: signal: killed Runtime"
                handler="/packages/functions/src/events/log-poller-status.handler"
                modifiedAt={new Date().getTime() - 1000 * 60 * 24 * 2}
                createdAt={1620000000000}
              />
              <Issue
                count={73412}
                error="NoSuchBucketNoSuchBucketNoSuchBucketNoSuchBucketNoSuchBucketNoSuchBucketNoSuchBucketNoSuchBucketNoSuchBucketNoSuchBucketNoSuchBucketNoSuchBucket"
                message="The specified bucket does not exist in the specified region and this is a really long error message that should overflow because it is way too long to fit in a line, this seems long enough."
                handler="/packages/functions/src/events/file/path/that/is/also/way-too-long-because-it-needs-to-overflow-and-we-need-to-make-it-too-long-log-poller-status.handler"
                modifiedAt={new Date().getTime() - 1000 * 60 * 60 * 24 * 2}
                createdAt={1620000000000}
              />
            </IssuesList>
          </div>
        </Stack>
      </Content>
    </>
  );
}

const IssueRoot = styled("div", {
  base: {
    ...utility.row(4),
    padding: theme.space[4],
    borderTop: `1px solid ${theme.color.divider.base}`,
    alignItems: "center",
    ":first-child": {
      borderTop: 0,
    },
  },
});

const IssueError = styled(Link, {
  base: {
    overflow: "hidden",
    lineHeight: "normal",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  variants: {
    weight: {
      regular: {
        fontWeight: 400,
      },
      medium: {
        fontWeight: 500,
      },
      semibold: {
        fontWeight: 600,
      },
    },
  },
  defaultVariants: {
    weight: "regular",
  },
});

type IssueProps = {
  error: string;
  count: number;
  handler: string;
  message: string;
  unread?: boolean;
  createdAt: number;
  modifiedAt: number;
};

function Issue(props: IssueProps) {
  return (
    <IssueRoot>
      <IssueCol>
        <input type="checkbox" />
      </IssueCol>
      <IssueCol grow>
        <Stack space="2">
          <IssueError href="123" weight={props.unread ? "medium" : "regular"}>
            {props.error}
          </IssueError>
          <Stack space="1">
            <Text line size="sm" leading="normal">
              {props.message}
            </Text>

            <Text code line leading="normal" size="mono_sm" color="dimmed">
              {props.handler}
            </Text>
          </Stack>
        </Stack>
      </IssueCol>
      <IssueCol align="right" style={{ width: `${COL_COUNT_WIDTH}px` }}>
        <Text code size="mono_base" title={props.count.toString()}>
          {formatNumber(props.count, true)}
        </Text>
      </IssueCol>
      <IssueCol align="right" style={{ width: `${COL_TIME_WIDTH}px` }}>
        <Text line leading="normal" size="sm" color="dimmed">
          <span title={new Date(props.modifiedAt).toUTCString()}>
            {formatSinceTime(props.modifiedAt)}
          </span>{" "}
          &mdash;{" "}
          <span title={new Date(props.createdAt).toUTCString()}>
            {formatSinceTime(props.createdAt)}
          </span>
        </Text>
      </IssueCol>
    </IssueRoot>
  );
}
