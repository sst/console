import { provideActor } from "@console/core/actor";
import { Stage } from "@console/core/app";
import { Log } from "@console/core/log";

provideActor({
  type: "system",
  properties: {
    workspaceID: "oiwmwdb26rsyu6dtlhum289q",
  },
});

const config = await Stage.assumeRole("n42t9fy1z9ht91sh34tyikq0");
if (!config) throw new Error("No config");

console.time("time");
const results = await Log.expand({
  config,
  group: "foo",
  logGroup: "/aws/lambda/prod-api-Http-HttpProxyDA8736AC-doxWjkTNAD2l",
  logStream: "2023/09/15/[$LATEST]c755589de743473da8b140c4c38ffe78",
  functionArn: "asd",
  timestamp: 1694806099320,
});
console.timeEnd("time");
console.log(results);
