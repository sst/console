import {
  Row,
  Text,
  Stack,
  Button,
  FormInput,
  Fullscreen,
  theme,
  utility,
} from "$/ui";
import { IconApp } from "$/ui/icons/custom";
import { styled } from "@macaron-css/solid";
import { Navigate, Route, Routes } from "@solidjs/router";
import { For, Show, createSignal, onMount } from "solid-js";
import Botpoison from "@botpoison/browser";
import { createSingleSelectListState } from "@kobalte/core";

const Root = styled("div", {
  base: {
    alignItems: "center",
    width: 320,
  },
  variants: {
    form: {
      email: {
        ...utility.stack(5),
      },
      code: {
        ...utility.stack(8),
      },
    },
  },
});

const Form = styled("form", {
  base: {
    width: 320,
    ...utility.stack(5),
    selectors: {
      [`${Root.selector({ form: "email" })} &`]: {
        paddingTop: theme.space[5],
        borderTop: `1px solid ${theme.color.divider.base}`,
      },
      [`${Root.selector({ form: "code" })} &`]: {},
    },
  },
});

const LoginIcon = styled("div", {
  base: {
    width: 42,
    height: 42,
    color: theme.color.accent,
  },
});

const NewConsoleTips = styled("ul", {
  base: {
    ...utility.stack(2.5),
    width: "100%",
    padding: `${theme.space[4]} ${theme.space[2]} ${theme.space[4]} 30px`,
    listStyle: "circle",
    backgroundColor: theme.color.background.surface,
    borderRadius: theme.borderRadius,
    fontSize: theme.font.size.sm,
    color: theme.color.text.secondary.surface,
  },
});

const OldConsoleSign = styled("div", {
  base: {
    ...utility.row(2.5),
    alignItems: "flex-start",
    backgroundColor: theme.color.background.surface,
    borderRadius: theme.borderRadius,
    padding: `${theme.space[3.5]} ${theme.space[3.5]}`,
  },
});

export function Auth() {
  return (
    <Fullscreen>
      <Routes>
        <Route path="email" component={Email} />
        <Route path="code" component={Code} />
        <Route path="" element={<Navigate href="email" />} />
      </Routes>
    </Fullscreen>
  );
}

export function Email() {
  const botpoison = new Botpoison({
    publicKey: "pk_646d2d37-ab95-43d1-ae96-3ad59616e362",
  });

  const [challenge, setChallenge] = createSignal<string>();
  const [submitting, setSubmitting] = createSignal<boolean>();
  const ready = botpoison
    .challenge()
    .then((value) => setChallenge(value.solution));

  return (
    <Root form="email">
      <Stack horizontal="center" space="5" style={{ width: "100%" }}>
        <LoginIcon>
          <IconApp />
        </LoginIcon>
        <Stack horizontal="center" space="4" style={{ width: "100%" }}>
          <Stack horizontal="center" space="2">
            <Text size="lg" weight="medium">
              Welcome to the SST Console
            </Text>
            <Text color="secondary" on="base" center>
              Sign in with your email to get started
            </Text>
          </Stack>
          <NewConsoleTips>
            <li>
              <Text size="sm" on="surface" color="secondary" leading="normal">
                <a href="https://docs.sst.dev/console" target="_blank">
                  Learn more
                </a>{" "}
                about the new console.
              </Text>
            </li>
            <li>
              <Text size="sm" on="surface" color="secondary" leading="normal">
                Need help?{" "}
                <a href="https://sst.dev/discord" target="_blank">
                  Join #console
                </a>{" "}
                on Discord.
              </Text>
            </li>
            <li>
              <Text size="sm" on="surface" color="secondary" leading="normal">
                Looking for the old console?{" "}
                <a target="_blank" href="https://old.console.sst.dev">
                  Click here
                </a>
                .
              </Text>
            </li>
          </NewConsoleTips>
        </Stack>
      </Stack>
      <Form
        method="get"
        action={import.meta.env.VITE_AUTH_URL + "/authorize"}
        onSubmit={async (e) => {
          setSubmitting(true);
          e.preventDefault();
          const form = e.currentTarget;
          await ready;
          form.submit();
        }}
      >
        <FormInput autofocus type="email" name="email" placeholder="Email" />
        <input type="hidden" name="client_id" value="solid" />
        <input
          type="hidden"
          name="redirect_uri"
          value={location.origin + "/"}
        />
        <input type="hidden" name="response_type" value="token" />
        <input type="hidden" name="provider" value="email" />
        <input type="hidden" name="challenge" value={challenge()} />
        <Stack space="3">
          <Button type="submit" disabled={submitting()}>
            {submitting() ? "Submitting" : "Continue"}
          </Button>
          <Text center size="sm" color="dimmed">
            We'll send a pin code to your email
          </Text>
        </Stack>
      </Form>
    </Root>
  );
}

export function Code() {
  const [disabled, setDisabled] = createSignal(false);

  function submit() {
    setDisabled(true);
    const code = [...document.querySelectorAll("[data-element=code]")]
      .map((el) => (el as HTMLInputElement).value)
      .join("");
    location.href =
      import.meta.env.VITE_AUTH_URL +
      "/callback?" +
      new URLSearchParams({
        code,
      }).toString();
  }

  return (
    <Root form="code">
      <Stack horizontal="center" space="5">
        <LoginIcon>
          <IconApp />
        </LoginIcon>
        <Stack horizontal="center" space="2">
          <Text size="lg" weight="medium">
            Let's verify your email
          </Text>
          <Text color="secondary" on="base" center>
            Check your inbox for the code we sent you
          </Text>
        </Stack>
      </Stack>
      <Form method="get" action={import.meta.env.VITE_AUTH_URL + "/authorize"}>
        <Row horizontal="between">
          <For each={Array(6).fill(0)}>
            {() => (
              <FormInput
                style={{
                  width: "40px",
                  "text-align": "center",
                  "font-family": `${theme.font.family.code}`,
                }}
                data-element="code"
                maxLength={1}
                autofocus
                disabled={disabled()}
                type="text"
                onPaste={(e) => {
                  const code = e.clipboardData?.getData("text/plain");
                  if (!code) return;
                  document.querySelectorAll("input").forEach((item, index) => {
                    item.value = code[index];
                  });
                  e.preventDefault();
                  submit();
                }}
                onFocus={(e) => {
                  e.currentTarget.select();
                }}
                onKeyDown={(e) => {
                  if (!e.currentTarget.value && e.key === "Backspace") {
                    e.preventDefault();
                    const previous =
                      e.currentTarget.parentNode?.parentNode?.previousSibling
                        ?.firstChild?.firstChild;
                    if (previous instanceof HTMLInputElement) {
                      previous.focus();
                    }
                    return;
                  }
                }}
                onInput={(e) => {
                  if (!e.currentTarget.value) {
                    const previous =
                      e.currentTarget.parentNode?.parentNode?.previousSibling
                        ?.firstChild?.firstChild;
                    if (previous instanceof HTMLInputElement) {
                      previous.focus();
                    }
                    return;
                  }

                  const next =
                    e.currentTarget.parentNode?.parentNode?.nextSibling
                      ?.firstChild?.firstChild;
                  if (next instanceof HTMLInputElement) {
                    next.focus();
                    next.select();
                    return;
                  }

                  if (!next) submit();
                }}
              />
            )}
          </For>
        </Row>
      </Form>
    </Root>
  );
}
