import { KinesisStreamEvent } from "aws-lambda";
import crypto from "crypto";
import { Issue } from "@console/core/issue";
import { unzipSync } from "zlib";
import { provideActor } from "@console/core/actor";
import { chunk, flatMap, map, pipe } from "remeda";

export const handler = async (event: KinesisStreamEvent) => {
  provideActor({
    type: "public",
    properties: {},
  });
  console.log("processing", event.Records.length, "records");
  await Promise.all(
    pipe(
      event.Records,
      flatMap((record) => {
        const decoded = JSON.parse(
          unzipSync(Buffer.from(record.kinesis.data, "base64")).toString()
        );
        console.log(decoded);
        if (decoded.messageType !== "DATA_MESSAGE") return [];
        return [decoded];
      }),
      chunk(1)
    ).map(async (records) =>
      /** A sample records look like this:
      {
        messageType: 'DATA_MESSAGE',
        owner: '112245769880',
        logGroup: '/aws/lambda/dev-playground-script-MyScriptonUpdateFunction2228-ic64MdU5Okv6',
        logStream: '2023/09/05/[$LATEST]19e77e0c06ea48549f441505f678b04c',
        subscriptionFilters: [ 'sst#us-east-2#112245769880#playground#dev' ],
        logEvents: [
          {
            id: '37775211252598979891749361079215540365867965172532183041',
            timestamp: 1693899056570,
            message: '2023-09-05T07:30:56.570Z\tee07766c-b337-4b4b-8f5c-a952f89ca1cf\tERROR\tHEY Task timed out after\n'
          },
          {
            id: '37775211323738357075062048900714481655616238376609710084',
            timestamp: 1693899059760,
            message: '2023-09-05T07:30:59.760Z\t1c6ff636-f941-4ee4-97af-f567357a33f4\tERROR\tHEY Task timed out after\n'
          }
        ]
      }
      */
      console.log({ records })
    )
  );

  return "success";
};
