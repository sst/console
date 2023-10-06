import { Replicache, ReadTransaction, WriteTransaction } from "replicache";
import {
  ParentProps,
  Show,
  createContext,
  createMemo,
  onCleanup,
  useContext,
} from "solid-js";
import { Splash } from "$/ui";
import { useAuth } from "./auth";
import { Client } from "@console/functions/replicache/framework";
import type { ServerType } from "@console/functions/replicache/server";
import { bus } from "./bus";
import { UserStore } from "$/data/user";
import { LambdaPayloadStore } from "$/data/lambda-payload";
import { LogSearchStore } from "$/data/log-search";
import { makeEventListener } from "@solid-primitives/event-listener";
import { IssueStore } from "$/data/issue";
import { DateTime } from "luxon";
import { WarningStore } from "$/data/warning";
import { useDummy } from "./dummy";
import { createGet, createScan } from "$/data/store";

const mutators = new Client<ServerType>()
  .mutation("connect", async () => {})
  .mutation("app_stage_sync", async () => {})
  .mutation("log_poller_subscribe", async () => {})
  .mutation("log_search", async (tx, input) => {
    await LogSearchStore.put(tx, [input.id], input);
  })
  .mutation("user_create", async (tx, input) => {
    await tx.put(`/user/${input.id}`, {
      id: input.id,
      email: input.email,
      timeCreated: new Date().toISOString(),
    });
  })
  .mutation("user_remove", async (tx, input) => {
    await UserStore.update(tx, input, (item) => {
      item.timeDeleted = DateTime.now().toUTC().toSQL({ includeOffset: false });
    });
  })
  .mutation("function_invoke", async () => {})
  .mutation("function_payload_save", async (tx, input) => {
    await LambdaPayloadStore.put(tx, [input.id!], {
      id: input.id!,
      name: input.name,
      payload: input.payload,
      key: input.key,
      timeCreated: DateTime.now().toUTC().toSQL({ includeOffset: false })!,
    });
  })
  .mutation("function_payload_remove", async (tx, input) => {
    await LambdaPayloadStore.remove(tx, input);
  })
  .mutation("issue_resolve", async (tx, input) => {
    for (const id of input) {
      await IssueStore.update(tx, id, (item) => {
        item.timeResolved = DateTime.now().toSQL({ includeOffset: false });
        item.timeIgnored = null;
      });
    }
  })
  .mutation("issue_unresolve", async (tx, input) => {
    for (const id of input) {
      await IssueStore.update(tx, id, (item) => {
        item.timeResolved = null;
      });
    }
  })
  .mutation("issue_ignore", async (tx, input) => {
    for (const id of input) {
      await IssueStore.update(tx, id, (item) => {
        item.timeIgnored = DateTime.now().toSQL({ includeOffset: false });
        item.timeResolved = null;
      });
    }
  })
  .mutation("issue_unignore", async (tx, input) => {
    for (const id of input) {
      await IssueStore.update(tx, id, (item) => {
        item.timeIgnored = null;
      });
    }
  })
  .mutation("issue_subscribe", async (tx, input) => {
    const warnings = await WarningStore.forStage(tx, input.stageID);
    for (const warning of warnings) {
      await tx.del(`/warning/${warning.stageID}/${warning.type}/${warning.id}`);
    }
  })
  .build();

const ReplicacheContext =
  createContext<() => ReturnType<typeof createReplicache>>();

function createReplicache(workspaceID: string, token: string) {
  const dummy = useDummy();
  const replicache = new Replicache({
    name: workspaceID,
    auth: `Bearer ${token}`,
    licenseKey: "l24ea5a24b71247c1b2bb78fa2bca2336",
    pullURL:
      import.meta.env.VITE_API_URL +
      (dummy()
        ? `/replicache/dummy/pull?dummy=${dummy()}`
        : "/replicache/pull1"),
    pushURL: import.meta.env.VITE_API_URL + "/replicache/push1",
    pullInterval: 60 * 1000,
    mutators,
    indexes: {
      id: {
        allowEmpty: true,
        jsonPointer: "/id",
      },
    },
  });

  replicache.puller = async (req) => {
    const result = await fetch(replicache.pullURL, {
      headers: {
        "x-sst-workspace": workspaceID,
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(req),
      method: "POST",
    });
    return {
      response: result.status === 200 ? await result.json() : undefined,
      httpRequestInfo: {
        httpStatusCode: result.status,
        errorMessage: result.statusText,
      },
    };
  };

  replicache.pusher = async (req) => {
    const result = await fetch(replicache.pushURL, {
      headers: {
        "x-sst-workspace": workspaceID,
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(req),
      method: "POST",
    });
    return {
      httpRequestInfo: {
        httpStatusCode: result.status,
        errorMessage: result.statusText,
      },
    };
  };

  return replicache;
}

export function ReplicacheProvider(
  props: ParentProps<{ accountID: string; workspaceID: string }>
) {
  const tokens = useAuth();
  const token = createMemo(() => tokens[props.accountID]?.session.token);

  const rep = createMemo(() => {
    return createReplicache(props.workspaceID, token()!);
  });

  makeEventListener(window, "focus", () => {
    console.log("refocused");
    rep().pull();
  });

  bus.on("poke", (properties) => {
    if (properties.workspaceID !== props.workspaceID) return;
    rep().pull();
  });

  onCleanup(() => {
    rep().close();
  });

  const init = createGet(() => "/init", rep);

  return (
    <Show when={rep() && init()} fallback={<Splash />}>
      <ReplicacheContext.Provider value={rep}>
        {props.children}
      </ReplicacheContext.Provider>
    </Show>
  );
}

export function useReplicache() {
  const result = useContext(ReplicacheContext);
  if (!result) {
    throw new Error("useReplicache must be used within a ReplicacheProvider");
  }

  return result;
}
