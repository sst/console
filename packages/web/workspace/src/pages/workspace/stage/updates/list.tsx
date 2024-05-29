import { For, Show, createEffect, createMemo } from "solid-js";
import { Link } from "@solidjs/router";
import { DateTime } from "luxon";
import { styled } from "@macaron-css/solid";
import { Stack, theme, utility } from "$/ui";
import { Dropdown } from "$/ui/dropdown";
import { IconEllipsisVertical } from "$/ui/icons";
import { inputFocusStyles } from "$/ui/form";
import { globalKeyframes } from "@macaron-css/core";
import { formatSinceTime } from "$/common/format";
import { StateUpdateStore } from "$/data/app";
import { useReplicache } from "$/providers/replicache";
import { useStageContext } from "../context";
import { sortBy } from "remeda";

const LEGEND_RES = 2;
const LEGEND_WIDTH = 200;

export const CMD_MAP = {
  deploy: "sst deploy",
  refresh: "sst refresh",
  remove: "sst remove",
  edit: "sst state edit",
};

export const STATUS_MAP = {
  queued: "Queued",
  canceled: "Canceled",
  updated: "Complete",
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
    ...utility.row(4),
    width: 320,
    alignItems: "center",
  },
});

export const UpdateStatusIcon = styled("div", {
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
        animation: "glow-pulse-status 1.7s linear infinite alternate",
      },
    },
  },
});

globalKeyframes("glow-pulse-status", {
  "0%": {
    opacity: 0.3,
    filter: `drop-shadow(0 0 0px ${theme.color.accent})`,
  },
  "50%": {
    opacity: 1,
    filter: `drop-shadow(0 0 1px ${theme.color.accent})`,
  },
  "100%": {
    opacity: 0.3,
    filter: `drop-shadow(0 0 0px ${theme.color.accent})`,
  },
});

const UpdateLink = styled(Link, {
  base: {
    fontWeight: theme.font.weight.medium,
  },
});

const UpdateLinkPrefix = styled("span", {
  base: {
    marginRight: 1,
    fontWeight: theme.font.weight.regular,
    fontSize: theme.font.size.sm,
  },
});

const UpdateStatusCopy = styled("p", {
  base: {
    fontSize: theme.font.size.xs,
    color: theme.color.text.dimmed.base,
  },
});

const UpdateRightCol = styled(UpdateCol, {
  base: {
    ...utility.row(3),
    width: 380,
    alignItems: "center",
    justifyContent: "space-between",
  },
});

const ChangeLegendRoot = styled("div", {
  base: {
    ...utility.row("px"),
  },
  variants: {
    empty: {
      true: {
        height: 16,
        width: LEGEND_WIDTH,
        borderRadius: 2,
        backgroundSize: "4px 4px",
        backgroundColor: "transparent",
        border: `1px solid ${theme.color.background.surface}`,
        backgroundImage: `repeating-linear-gradient(
          45deg,
          ${theme.color.background.selected} 0,
          ${theme.color.background.selected} 1px,
          transparent 0,
          transparent 50%
        )`,
      },
    },
  },
});

const ChangeLegendTag = styled("div", {
  base: {
    height: 16,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    textTransform: "uppercase",
    userSelect: "none",
    WebkitUserSelect: "none",
    fontWeight: theme.font.weight.semibold,
    justifyContent: "center",
    fontSize: "0.625rem",
    ":first-child": {
      borderTopLeftRadius: 2,
      borderBottomLeftRadius: 2,
    },
    ":last-child": {
      borderTopRightRadius: 2,
      borderBottomRightRadius: 2,
    },
  },
  variants: {
    type: {
      created: {
        backgroundColor: `hsla(${theme.color.blue.l2}, 100%)`,
      },
      deleted: {
        backgroundColor: `hsla(${theme.color.red.l1}, 100%)`,
      },
      updated: {
        backgroundColor: `hsla(${theme.color.brand.l2}, 100%)`,
      },
      same: {
        backgroundColor: theme.color.divider.base,
      },
    },
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
  index: string;
  errors?: any[];
  timeStarted?: string;
  timeQueued?: string;
  source: "ci" | "cli";
  resourceSame?: number;
  timeCanceled?: string;
  timeCompleted?: string;
  same?: number;
  created?: number;
  updated?: number;
  deleted?: number;
  command: "deploy" | "refresh" | "remove" | "edit";
};
function Update(props: UpdateProps) {
  createEffect(() => console.log({ ...props }));
  const errors = () => props.errors?.length || 0;
  const status = createMemo(() =>
    props.timeCompleted
      ? errors()
        ? "error"
        : "updated"
      : props.timeCanceled
        ? "canceled"
        : props.timeQueued
          ? "queued"
          : "updating",
  );

  return (
    <UpdateRoot>
      <UpdateStatus>
        <UpdateStatusIcon status={status()} />
        <Stack space="2">
          <UpdateLink href={props.id}>
            <UpdateLinkPrefix>#</UpdateLinkPrefix>
            {props.index}
          </UpdateLink>
          <UpdateStatusCopy>
            {status() === "error"
              ? errorCountCopy(errors())
              : STATUS_MAP[status()]}
          </UpdateStatusCopy>
        </Stack>
      </UpdateStatus>
      <UpdateRightCol>
        <ChangeLegend
          same={props.same}
          created={props.created}
          updated={props.updated}
          deleted={props.deleted}
        />
        <UpdateActions>
          <UpdateSource>
            <UpdateCmd>{CMD_MAP[props.command]}</UpdateCmd>
            <Show when={props.timeStarted}>
              <UpdateTime
                title={DateTime.fromISO(props.timeStarted!).toLocaleString(
                  DateTime.DATETIME_FULL,
                )}
              >
                {formatSinceTime(DateTime.fromISO(props.timeStarted!).toSQL()!, true)}
              </UpdateTime>
            </Show>
          </UpdateSource>
          <Show when={props.source === "ci"}>
            <Dropdown
              size="sm"
              icon={<IconEllipsisVertical width={18} height={18} />}
            >
              <Dropdown.Item disabled={status() !== "updated"}>
                View State
              </Dropdown.Item>
              <Dropdown.Seperator />
              <Dropdown.Item>View Logs</Dropdown.Item>
            </Dropdown>
          </Show>
        </UpdateActions>
      </UpdateRightCol>
    </UpdateRoot>
  );
}

type ChangeLegendProps = {
  same?: number;
  created?: number;
  updated?: number;
  deleted?: number;
};
function ChangeLegend(props: ChangeLegendProps) {
  const same = () => props.same! ?? 0;
  const created = () => props.created! ?? 0;
  const updated = () => props.updated! ?? 0;
  const deleted = () => props.deleted! ?? 0;

  const total = () => same() + created() + updated() + deleted();

  const widths = createMemo(() => {
    const nonZero = [same(), created(), updated(), deleted()].filter(
      (n) => n !== 0,
    ).length;

    let sameWidth =
      Math.ceil(((same() / total()) * LEGEND_WIDTH) / LEGEND_RES) * LEGEND_RES;
    let createdWidth =
      Math.ceil(((created() / total()) * LEGEND_WIDTH) / LEGEND_RES) *
      LEGEND_RES;
    let updatedWidth =
      Math.ceil(((updated() / total()) * LEGEND_WIDTH) / LEGEND_RES) *
      LEGEND_RES;
    let deletedWidth =
      Math.ceil(((deleted() / total()) * LEGEND_WIDTH) / LEGEND_RES) *
      LEGEND_RES;

    const calculatedTotalWidth =
      sameWidth + createdWidth + updatedWidth + deletedWidth;
    const widthDifference = LEGEND_WIDTH - (nonZero - 1 + calculatedTotalWidth);

    if (widthDifference !== 0) {
      const maxWidth = Math.max(
        sameWidth,
        createdWidth,
        updatedWidth,
        deletedWidth,
      );
      if (maxWidth === sameWidth) {
        sameWidth += widthDifference;
      } else if (maxWidth === createdWidth) {
        createdWidth += widthDifference;
      } else if (maxWidth === updatedWidth) {
        updatedWidth += widthDifference;
      } else if (maxWidth === deletedWidth) {
        deletedWidth += widthDifference;
      }
    }
    return {
      same: sameWidth,
      created: createdWidth,
      updated: updatedWidth,
      deleted: deletedWidth,
    };
  });

  return (
    <ChangeLegendRoot
      empty={total() === 0}
      title={total() === 0 ? "No changes" : undefined}
    >
      <Show when={deleted() !== 0}>
        <ChangeLegendTag
          type="deleted"
          title={`${deleted()} deleted`}
          style={{ width: `${widths().deleted}px` }}
        />
      </Show>
      <Show when={created() !== 0}>
        <ChangeLegendTag
          type="created"
          title={`${created()} added`}
          style={{ width: `${widths().created}px` }}
        />
      </Show>
      <Show when={updated() !== 0}>
        <ChangeLegendTag
          type="updated"
          title={`${updated()} updated`}
          style={{ width: `${widths().updated}px` }}
        />
      </Show>
      <Show when={same() !== 0}>
        <ChangeLegendTag
          type="same"
          title={`${same()} unchanged`}
          style={{ width: `${widths().same}px` }}
        />
      </Show>
    </ChangeLegendRoot>
  );
}

export function List() {
  const rep = useReplicache();
  const ctx = useStageContext();
  const updates = StateUpdateStore.forStage.watch(rep, () => [ctx.stage.id]);
  return (
    <Content>
      <div>
        <For
          each={sortBy(updates(), [(item) => item.time.started || "", "desc"])}
        >
          {(item, index) => (
            <Update
              index={item.index}
              id={item.id}
              errors={item.errors}
              command={item.command}
              source={item.source.type}
              timeStarted={item.time.started}
              timeCompleted={item.time.completed}
              same={item.resource.same}
              created={item.resource.created}
              updated={item.resource.updated}
              deleted={item.resource.deleted}
            />
          )}
        </For>
      </div>
    </Content>
  );
}

export function countCopy(count?: number) {
  return count! > 1 ? `${count} resources` : "1 resource";
}

export function errorCountCopy(count?: number) {
  return count! > 1 ? `${count} errors` : "Error";
}
