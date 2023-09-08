import { Issue } from "@console/core/issue";
import { unzipSync } from "zlib";
import { provideActor } from "@console/core/actor";
import { Handler } from "sst/context";
import { KinesisStreamEvent } from "aws-lambda";

declare module "sst/context" {
  interface Handlers {
    kinesis_stream: {
      event: KinesisStreamEvent;
      response: string;
    };
  }
}

export const handler = Handler("kinesis_stream", async (event) => {
  provideActor({
    type: "public",
    properties: {},
  });
  for (const record of event.Records) {
    const decoded = JSON.parse(
      unzipSync(Buffer.from(record.kinesis.data, "base64")).toString()
    );
    if (decoded.messageType !== "DATA_MESSAGE") continue;
    try {
      await Issue.extract(decoded);
    } catch (ex) {
      console.error(ex);
    }
  }

  return "success";
});
