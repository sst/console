import {
  Grower,
  Button,
  FormInput,
  LinkButton,
  Row,
  Stack,
  Text,
  theme,
} from "$/ui";
import { Modal } from "$/ui/modal";
import { utility } from "$/ui/utility";
import { styled } from "@macaron-css/solid";
import { createEffect } from "solid-js";
import { createStore } from "solid-js/store";
import { DateTime } from "luxon";

function init() {
  const [state, setState] = createStore<{
    show: boolean;
  }>({
    show: false,
  });

  return {
    state,
    control: {
      show() {
        console.log("here");
        setState("show", true);
      },
      hide() {
        setState("show", false);
      },
    },
  };
}

const Form = styled("form", {
  base: {
    width: theme.modalWidth.sm,
    padding: theme.space[5],
  },
});

const GraphicSpacer = styled("div", {
  base: {
    ...utility.row(0),
    width: theme.space[8],
    alignItems: "center",
    justifyContent: "center",
  },
});

const GraphicStem = styled("div", {
  base: {
    flex: 1,
    height: 2,
    backgroundColor: theme.color.divider.base,
  },
});

export type DialogRangeControl = ReturnType<typeof init>["control"];

export function DialogRange(props: {
  onSelect: (start: Date, end: Date) => void;
  control: (control: DialogRangeControl) => void;
}) {
  const { state, control } = init();
  let start!: HTMLInputElement;
  let end!: HTMLInputElement;

  createEffect(() => {
    if (state.show) {
      setTimeout(() => start.focus(), 0);
    }
  });

  createEffect(() => {
    props.control(control);
  });

  return (
    <Modal onClose={() => control.hide()} show={state.show}>
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const start = new Date(fd.get("start")?.toString()!);
          const end = new Date(fd.get("end")?.toString()!);
          if (!start || !end) return;
          props.onSelect(start, end);
          control.hide();
        }}
      >
        <Stack space="5">
          <Stack space="2">
            <Text size="lg" weight="medium">
              View logs between
            </Text>
          </Stack>
          <Row space="1">
            <Grower>
              <FormInput
                onChange={(e) => {
                  if (end.value) return;
                  console.log(e.currentTarget.value);
                  const start = DateTime.fromISO(e.currentTarget.value);
                  if (!start) return;
                  end.value = start
                    .plus({ hours: 1 })
                    .toISO()
                    ?.substring(0, 16)!;
                }}
                ref={start}
                name="start"
                type="datetime-local"
              />
            </Grower>
            <GraphicSpacer>
              <GraphicStem />
            </GraphicSpacer>
            <Grower>
              <FormInput ref={end} name="end" type="datetime-local" />
            </Grower>
          </Row>
          <Row space="5" vertical="center" horizontal="end">
            <LinkButton onClick={() => control.hide()}>Cancel</LinkButton>
            <Button color="secondary">View Logs</Button>
          </Row>
        </Stack>
      </Form>
    </Modal>
  );
}
