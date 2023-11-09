import {
  Input,
  Grower,
  Button,
  FormField,
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
  onSelect: (end: Date) => void;
  control: (control: DialogRangeControl) => void;
}) {
  const { state, control } = init();
  let end!: HTMLInputElement;

  createEffect(() => {
    if (state.show) {
      setTimeout(() => end.focus(), 0);
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
          const end = new Date(fd.get("end")?.toString()!);
          if (!end) return;
          props.onSelect(end);
          control.hide();
        }}
      >
        <Stack space="5">
          <Stack space="2">
            <Text size="lg" weight="medium">
              Jump to
            </Text>
          </Stack>
          <Row space="1">
            <Grower>
              <FormField hint="Look for logs older than the given date">
                <Input ref={end} name="end" type="datetime-local" />
              </FormField>
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
