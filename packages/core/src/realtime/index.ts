export * as Realtime from ".";
import { IoTClient } from "@aws-sdk/client-iot";
import {
  IoTDataPlaneClient,
  PublishCommand,
} from "@aws-sdk/client-iot-data-plane";
import { Config } from "sst/node/config";
import { useWorkspace } from "../actor";

const data = new IoTDataPlaneClient({});

export async function publish(topic: string, properties: any) {
  const workspaceID = useWorkspace();
  await data.send(
    new PublishCommand({
      payload: Buffer.from(
        JSON.stringify({
          properties,
          workspaceID,
        })
      ),
      topic: `console/${Config.STAGE}/${workspaceID}/${topic}`,
    })
  );
}
