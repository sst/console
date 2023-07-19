import { useReplicache } from "$/providers/replicache";
import { Button, FormInput, LinkButton, Row, Stack, Text, theme } from "$/ui";
import { Modal } from "$/ui/modal";
import { styled } from "@macaron-css/solid";
import { createId } from "@paralleldrive/cuid2";
import { batch, createEffect } from "solid-js";
import { createStore, unwrap } from "solid-js/store";

function init() {
  const [state, setState] = createStore<{
    show: boolean;
    functionARN: string;
    payload: any;
  }>({
    show: false,
    payload: null,
    functionARN: "",
  });

  const input = () =>
    document.querySelector<HTMLInputElement>(
      "[data-element=save-payload-dialog-name]"
    )!;

  return {
    state,
    control: {
      show(functionARN: string, payload: any) {
        batch(() => {
          setState("show", true);
          setState("functionARN", functionARN);
          setState("payload", payload);
        });
        setTimeout(() => input().focus(), 0);
      },
      hide() {
        setState("show", false);
        input().value = "";
      },
    },
  };
}

export type DialogPayloadSaveControl = ReturnType<typeof init>["control"];

const Form = styled("form", {
  base: {
    padding: theme.space[5],
    width: 480,
  },
});

export function DialogPayloadSave(props: {
  control: (control: DialogPayloadSaveControl) => void;
}) {
  const { state, control } = init();
  const rep = useReplicache();

  createEffect(() => {
    props.control(control);
  });

  return (
    <Modal onClose={() => control.hide()} show={state.show}>
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          rep().mutate.function_payload_save({
            id: createId(),
            payload: structuredClone(unwrap(state.payload)),
            key: "test",
            name: fd.get("name") as string,
          });
          control.hide();
        }}
      >
        <Stack space="5">
          <Stack space="2">
            <Text size="lg" weight="medium">
              Save event to workspace
            </Text>
          </Stack>
          <FormInput
            data-element={"save-payload-dialog-name"}
            autofocus
            name="name"
            label="Event name"
            minLength={1}
            hint="Give the event a short recognizable name."
            placeholder="EventA"
          />
          <Row space="5" vertical="center" horizontal="end">
            <LinkButton onClick={() => control.hide()}>Cancel</LinkButton>
            <Button color="secondary">Save Event</Button>
          </Row>
        </Stack>
      </Form>
    </Modal>
  );
}
