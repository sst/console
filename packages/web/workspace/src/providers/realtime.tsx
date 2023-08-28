import { createSubscription, useReplicache } from "$/providers/replicache";
import { iot, mqtt } from "aws-iot-device-sdk-v2";
import { createEffect, onCleanup, onMount } from "solid-js";
import { useAuth } from "./auth";
import { WorkspaceStore } from "$/data/workspace";
import { bus } from "./bus";
import { createId } from "@paralleldrive/cuid2";

export function RealtimeProvider() {
  let connection: mqtt.MqttClientConnection;
  const auth = useAuth();

  onMount(async () => {
    const url = import.meta.env.VITE_IOT_HOST;
    const tokens = Object.values(auth)
      .map((account) => account.token.token)
      .join(";");
    const workspaces = new Map<string, string[]>();
    for (const [accountID, account] of Object.entries(auth)) {
      const list = await account.replicache.query(WorkspaceStore.list());
      for (const workspace of list) {
        let arr = workspaces.get(workspace.id);
        if (!arr) {
          workspaces.set(workspace.id, [accountID]);
          continue;
        }
        arr.push(accountID);
      }
    }

    async function createConnection() {
      console.log("creating new connection");
      if (connection) await connection.disconnect();
      const config = iot.AwsIotMqttConnectionConfigBuilder.new_with_websockets()
        .with_clean_session(true)
        .with_client_id("client_" + createId())
        .with_endpoint(url)
        .with_custom_authorizer(
          "",
          `${import.meta.env.VITE_STAGE}-console-authorizer`,
          "",
          tokens
        )
        .with_keep_alive_seconds(30)
        .build();
      const client = new mqtt.MqttClient();
      connection = client.new_connection(config);

      connection.on("connect", async () => {
        console.log("WS connected");
        for (const workspace of workspaces.keys()) {
          console.log("subscribing to", workspace);
          await connection.subscribe(
            `console/${import.meta.env.VITE_STAGE}/${workspace}/#`,
            mqtt.QoS.AtLeastOnce
          );
        }
      });
      connection.on("interrupt", (e) => {
        console.log("interrupted, restarting", e, JSON.stringify(e));
        createConnection();
      });
      connection.on("error", (e) => {
        console.log(
          "connection error",
          e,
          e.error,
          e.name,
          e.cause,
          e.message,
          e.error_code,
          e.error_name
        );
      });
      connection.on("resume", console.log);
      connection.on("message", (fullTopic, payload) => {
        const splits = fullTopic.split("/");
        const workspaceID = splits[2];
        const topic = splits[3];
        const message = new TextDecoder("utf8").decode(new Uint8Array(payload));
        const parsed = JSON.parse(message);
        if (topic === "poke") {
          bus.emit("poke", { workspaceID });
        } else {
          bus.emit(topic as any, parsed.properties);
        }
      });
      connection.on("disconnect", console.log);
      await connection.connect();
    }

    createConnection();
  });

  onCleanup(() => {
    if (connection) connection.disconnect();
  });

  return null;
}
