import { provideActor } from "@console/core/actor";
import { Stage } from "@console/core/app";
import { Log } from "@console/core/log";

provideActor({
  type: "system",
  properties: {
    workspaceID: "tss3o1t2xk17lnvw3ml469a4",
  },
});

const config = await Stage.assumeRole("lck4cw78h8kg09o79k85aoz2");

console.time("time");
const results = await Log.expand({
  timestamp: 1693065066289,
  requestID: "c813e342-13f8-43e2-a8bb-7a482b8b23d3",
  logGroup:
    "/aws/lambda/production-console-API-apiLambdaGETerror2DE42FB7-fbM3nDlmDAJ9",
  logStream: "2023/08/26/[$LATEST]6002e14ce0714ceca3347645822d47b0",
  functionArn:
    "arn:aws:lambda:us-east-1:226609089145:function:production-console-API-apiLambdaGETerror2DE42FB7-fbM3nDlmDAJ9",
  ...config!,
});
console.timeEnd("time");
console.log(results);
