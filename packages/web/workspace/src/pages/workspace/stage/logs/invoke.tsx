import { useReplicache } from "$/providers/replicache";
import {
  LinkButton,
  theme,
  utility,
  Text,
  IconButton,
  Row,
  TextButton,
  Button,
} from "$/ui";
import { IconCaretRightOutline } from "$/ui/icons/custom";
import { Resource } from "@console/core/app/resource";
import { style } from "@macaron-css/core";
import { styled } from "@macaron-css/solid";
import { createStore } from "solid-js/store";
import {
  DialogPayloadSave,
  DialogPayloadSaveControl,
} from "./dialog-payload-save";
import {
  DialogPayloadManage,
  DialogPayloadManageControl,
} from "./dialog-payload-manage";
import { useCommandBar } from "../../command-bar";
import { IconBookmark } from "$/ui/icons";
import { LambdaPayloadStore } from "$/data/lambda-payload";
import { useStageContext } from "../context";
import { createEffect, createMemo } from "solid-js";
import { createScan2 } from "$/data/store";

const InvokeRoot = styled("div", {
  base: {
    ...utility.row(0),
    borderTop: `1px solid ${theme.color.divider.base}`,
    justifyContent: "space-between",
    paddingLeft: theme.space[3],
    alignItems: "center",
    ":focus-within": {},
  },
  variants: {
    expand: {
      true: {
        ...utility.stack(0),
        backgroundColor: theme.color.input.background,
        height: "auto",
        alignItems: "stretch",
        padding: 0,
        paddingBottom: theme.space[3],
        resize: "vertical",
        overflow: "auto",
        minHeight: 170,
      },
      false: {},
    },
  },
});

const InvokeControls = styled("div", {
  base: {
    ...utility.row(0),
    height: 51,
    justifyContent: "space-between",
    padding: `0 ${theme.space[3]} 0 ${theme.space[4]}`,
    selectors: {
      [`${InvokeRoot.selector({ expand: true })} &`]: {
        height: "auto",
        flex: "0 0 auto",
        padding: `${theme.space[3]} ${theme.space[3]} 0 ${theme.space[4]}`,
      },
    },
  },
});

const InvokeControlsLeft = styled("div", {
  base: {
    ...utility.row(3),
    alignItems: "center",
    display: "none",
    selectors: {
      [`${InvokeRoot.selector({ expand: true })} &`]: {
        display: "flex",
      },
    },
  },
});

const InvokeControlsCancel = styled(LinkButton, {
  base: {
    display: "none",
    selectors: {
      [`${InvokeRoot.selector({ expand: true })} &`]: {
        display: "initial",
      },
    },
  },
});

const InvokeControlsButton = style({
  display: "none",
  selectors: {
    [`${InvokeRoot.selector({ expand: true })} &`]: {
      display: "initial",
    },
  },
});

const InvokeControlsLinkButton = style({
  display: "initial",
  selectors: {
    [`${InvokeRoot.selector({ expand: true })} &`]: {
      display: "none",
    },
  },
});

const InvokePayloadLabel = styled("div", {
  base: {
    ...utility.row(2),
    alignItems: "center",
    left: theme.space[3],
    selectors: {
      [`${InvokeRoot.selector({ expand: true })} &`]: {
        display: "none",
      },
    },
  },
});

const InvokePayloadLabelIcon = styled("div", {
  base: {
    width: 20,
    height: 20,
    color: theme.color.icon.dimmed,
  },
});

const InvokeTextArea = styled("textarea", {
  base: {
    display: "none",
    flex: "1 1 auto",
    padding: theme.space[4],
    border: "none",
    resize: "none",
    height: "100%",
    lineHeight: theme.font.lineHeight,
    appearance: "none",
    fontSize: theme.font.size.mono_sm,
    fontFamily: theme.font.family.code,
    background: "transparent",
    selectors: {
      [`${InvokeRoot.selector({ expand: true })} &`]: {
        display: "block",
      },
    },
  },
});

export interface InvokeControl {
  savePayload(payload: string): void;
}

interface Props {
  resource: Extract<Resource.Info, { type: "Function" }>;
  control: (control: InvokeControl) => void;
  onInvoke: () => void;
}

export function Invoke(props: Props) {
  const bar = useCommandBar();

  let invokeTextArea!: HTMLTextAreaElement;
  let saveControl!: DialogPayloadSaveControl;
  let manageControl!: DialogPayloadManageControl;
  const rep = useReplicache();
  const stage = useStageContext();
  const key = createMemo(() =>
    [stage.app.name, props.resource.cfnID].join("-")
  );
  const lambdaPayloads = LambdaPayloadStore.list.watch(
    rep,
    () => [],
    (items) => items.filter((payload) => payload.key === key())
  );

  const test = createScan2(() => "/lambdaPayload", rep);

  createEffect(() => {
    console.log([...test()]);
  });

  createEffect(() => {
    props.control({
      savePayload(payload) {
        saveControl.show(key(), payload);
      },
    });
  });

  function setPayload(value: any) {
    invokeTextArea.value = JSON.stringify(value, null, 2).trim();
    setInvoke("expand", true);
    invokeTextArea.focus();
    invokeTextArea.selectionStart = 0;
    invokeTextArea.selectionEnd = 0;
    invokeTextArea.scrollTop = 0;
  }

  function handleInvoke(e: MouseEvent) {
    e.stopPropagation();
    const payload = JSON.parse(invokeTextArea.value || "{}");
    setTimeout(() => setInvoke("invoking", false), 2000);
    setInvoke("invoking", true);
    rep().mutate.function_invoke({
      stageID: props.resource.stageID,
      payload,
      functionARN: props.resource.metadata.arn,
    });
    props.onInvoke();
  }
  const [invoke, setInvoke] = createStore<{
    invoking: boolean;
    expand: boolean;
    empty: boolean;
  }>({
    expand: false,
    invoking: false,
    empty: true,
  });

  bar.register("lambda-payloads", async (filter, global) => {
    if (global && !filter) return [];
    return lambdaPayloads().map((x) => ({
      icon: IconBookmark,
      category: "Event Payloads",
      title: x.name,
      async run(control) {
        setPayload(x.payload);
        control.hide();
      },
    }));
  });

  bar.register("invoke", async (filter, global) => {
    return [
      {
        icon: IconBookmark,
        category: "Invoke",
        title: "Load saved payloads...",
        async run(control) {
          control.show("lambda-payloads");
        },
      },
      {
        icon: IconBookmark,
        category: "Invoke",
        title: "Manage saved payloads...",
        async run(control) {
          control.hide();
          manageControl.show();
        },
      },
    ];
  });

  return (
    <InvokeRoot
      expand={invoke.expand}
      style={{
        /** Overrides height set by Chrome after resizing **/
        height: "auto",
      }}
      onClick={() => {
        setInvoke("expand", true);
        invokeTextArea.focus();
      }}
    >
      <InvokePayloadLabel>
        <InvokePayloadLabelIcon>
          <IconCaretRightOutline />
        </InvokePayloadLabelIcon>
        <Text leading="normal" size="sm" color="dimmed">
          Enter event payload
        </Text>
      </InvokePayloadLabel>
      <InvokeTextArea
        rows={7}
        spellcheck={false}
        ref={invokeTextArea}
        onInput={(e) => {
          setInvoke("empty", !Boolean(e.currentTarget.value));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.stopPropagation();
            const payload = JSON.parse(invokeTextArea.value || "{}");
            setTimeout(() => setInvoke("invoking", false), 2000);
            setInvoke("invoking", true);
            rep().mutate.function_invoke({
              stageID: props.resource.stageID,
              payload,
              functionARN: props.resource.metadata.arn,
            });
          }
        }}
      />
      <InvokeControls>
        <InvokeControlsLeft>
          <IconButton
            title="Load saved payloads"
            onClick={() => manageControl.show()}
          >
            <IconBookmark display="block" width={24} height={24} />
          </IconButton>
          <LinkButton
            style={{ display: invoke.empty ? "none" : "inline" }}
            onClick={() =>
              saveControl.show(key(), JSON.parse(invokeTextArea.value))
            }
          >
            Save
          </LinkButton>
        </InvokeControlsLeft>
        <Row vertical="center" space="4">
          <InvokeControlsCancel
            onClick={(e) => {
              e.stopPropagation();
              setInvoke("expand", false);
            }}
          >
            Cancel
          </InvokeControlsCancel>
          <Button
            color="secondary"
            onClick={handleInvoke}
            disabled={invoke.invoking}
            class={InvokeControlsButton}
          >
            {invoke.invoking ? "Invoking" : "Invoke"}
          </Button>
          <TextButton
            onClick={handleInvoke}
            disabled={invoke.invoking}
            class={InvokeControlsLinkButton}
          >
            {invoke.invoking ? "Invoking..." : "Invoke"}
          </TextButton>
        </Row>
      </InvokeControls>
      <DialogPayloadSave control={(control) => (saveControl = control)} />
      <DialogPayloadManage
        lambdaPayloads={lambdaPayloads()}
        onSelect={(item) => setPayload(item.payload)}
        control={(control) => (manageControl = control)}
      />
    </InvokeRoot>
  );
}
