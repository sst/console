import { For, Show } from "solid-js";
import { DateTime } from "luxon";
import { styled } from "@macaron-css/solid";
import { Row, Text, Stack, theme, utility, LinkButton } from "$/ui";
import { Dropdown } from "$/ui/dropdown";
import { IconEllipsisVertical } from "$/ui/icons";
import { inputFocusStyles } from "$/ui/form";
import { formatSinceTime, parseTime } from "$/common/format";
import { StateUpdateStore } from "$/data/app";
import { useReplicache } from "$/providers/replicache";
import { useStageContext } from "../context";

const CMD_MAP = {
  deploy: "sst deploy",
  refresh: "sst refresh",
  remove: "sst remove",
  edit: "sst state edit",
};

const STATUS_MAP = {
  queued: "Queued",
  canceled: "Canceled",
  updated: "Updated",
  error: "Error",
  updating: "In Progress",
};

const Content = styled("div", {
  base: {
    padding: theme.space[4],
  },
});

const UpdateRoot = styled("div", {
  base: {
    ...utility.row(4),
    justifyContent: "space-between",
    padding: theme.space[4],
    alignItems: "center",
    borderStyle: "solid",
    borderWidth: "0 1px 1px 1px",
    borderColor: theme.color.divider.base,
    position: "relative",
    ":first-child": {
      borderWidth: 1,
      borderTopLeftRadius: theme.borderRadius,
      borderTopRightRadius: theme.borderRadius,
    },
    ":last-child": {
      borderBottomLeftRadius: theme.borderRadius,
      borderBottomRightRadius: theme.borderRadius,
    },
    selectors: {
      "&[data-focus='true']": {
        ...inputFocusStyles,
        outlineOffset: -1,
      },
    },
  },
});

const UpdateCol = styled("div", {
  base: {
    minWidth: 0,
  },
});

const UpdateStatus = styled(UpdateCol, {
  base: {
    ...utility.row(3),
    width: 320,
    alignItems: "center",
  },
});

const UpdateStatusIcon = styled("div", {
  base: {
    width: 12,
    height: 12,
    borderRadius: "50%",
  },
  variants: {
    status: {
      queued: {
        backgroundColor: theme.color.divider.base,
      },
      canceled: {
        backgroundColor: theme.color.divider.base,
      },
      updated: {
        backgroundColor: `hsla(${theme.color.base.blue}, 100%)`,
      },
      error: {
        backgroundColor: `hsla(${theme.color.base.red}, 100%)`,
      },
      updating: {
        backgroundColor: `hsla(${theme.color.base.brand}, 100%)`,
      },
    },
  },
});

const UpdateStatusCopy = styled("p", {
  base: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary.base,
  },
});

const UpdateActions = styled(UpdateCol, {
  base: {
    ...utility.row(3),
    alignItems: "center",
    justifyContent: "flex-end",
  },
});

const UpdateSource = styled(UpdateCol, {
  base: {
    ...utility.stack(3),
    alignItems: "flex-end",
  },
});

// const UpdateSourceLabel = styled("span", {
//   base: {
//     ...utility.text.label,
//     color: theme.color.text.dimmed.base,
//     fontSize: theme.font.size.mono_sm,
//   },
// });
//
// const UpdateSourceCopy = styled("span", {
//   base: {
//     fontSize: theme.font.size.sm,
//     color: theme.color.text.primary.base,
//   },
// });

const UpdateCmd = styled("span", {
  base: {
    fontSize: theme.font.size.mono_sm,
    fontWeight: theme.font.weight.medium,
    fontFamily: theme.font.family.code,
    color: theme.color.text.primary.base,
  },
});

const UpdateTime = styled("span", {
  base: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.dimmed.base,
  },
});

// ...workspaceID,
// stageID: cuid("state_id").notNull(),
// command: mysqlEnum("command", [
//   "deploy",
//   "refresh",
//   "remove",
//   "edit",
// ]).notNull(),
// source: json("source").notNull(),
// ...timestamps,
// timeStarted: timestamp("time_started"),
// timeCompleted: timestamp("time_completed"),
// resourceDeleted: int("resource_deleted"),
// resourceCreated: int("resource_created"),
// resourceUpdated: int("resource_updated"),
// resourceSame: int("resource_same"),
// errors: int("errors"),

/**
 * CLI
 * - Date
 * - Link to view state
 * - Duration
 * - Status: started, finished,
 * - Source: CLI
 * - Command: Update, Refresh, Remove, Edit
 *
 * CI
 * - Date
 * - Link to commit
 * - Link to branch
 * - Commit message
 * - Github user
 * - Github avatar
 * - Success/Failure/In Progress/Queued/Cancelled
 * - Link to view state
 * - Link to view workflow logs
 */
type UpdateProps = {
  id: string;
  errors?: number;
  timeStarted: string;
  timeQueued?: string;
  source: "ci" | "cli";
  resourceSame?: number;
  timeCanceled?: string;
  timeCompleted?: string;
  resourceCreated?: number;
  resourceUpdated?: number;
  command: "deploy" | "refresh" | "remove" | "edit";
};
function Update(props: UpdateProps) {
  const status = props.timeCompleted
    ? props.errors
      ? "error"
      : "updated"
    : props.timeCanceled
      ? "canceled"
      : props.timeQueued
        ? "queued"
        : "updating";

  return (
    <UpdateRoot>
      <UpdateStatus>
        <UpdateStatusIcon status={status} />
        <Stack space="2">
          <p>
            <Text size="sm" color="secondary">
              #
            </Text>
            {props.id}
          </p>
          <UpdateStatusCopy>{STATUS_MAP[status]}</UpdateStatusCopy>
        </Stack>
      </UpdateStatus>
      <UpdateActions>
        <UpdateSource>
          <UpdateCmd>{CMD_MAP[props.command]}</UpdateCmd>
          <UpdateTime
            title={parseTime(props.timeStarted).toLocaleString(
              DateTime.DATETIME_FULL,
            )}
          >
            {formatSinceTime(props.timeStarted)}
          </UpdateTime>
        </UpdateSource>
        <Dropdown
          size="sm"
          icon={<IconEllipsisVertical width={18} height={18} />}
        >
          <Dropdown.Item disabled={status !== "updated"}>
            View State
          </Dropdown.Item>
          <Show when={props.source === "ci"}>
            <Dropdown.Seperator />
            <Dropdown.Item>View Logs</Dropdown.Item>
          </Show>
        </Dropdown>
      </UpdateActions>
    </UpdateRoot>
  );
}

export function Updates() {
  const rep = useReplicache();
  const ctx = useStageContext();
  const updates = StateUpdateStore.forStage.watch(rep, () => [ctx.stage.id]);
  return (
    <Content>
      <div>
        <For each={updates()}>
          {(item) => (
            <Update
              id={item.id}
              source={item.source.type}
              command={item.command}
              timeStarted={item.timeStarted || ""}
              timeCompleted={item.timeCompleted || undefined}
            />
          )}
        </For>
      </div>
    </Content>
  );
}
