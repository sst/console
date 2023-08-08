import { ApiHandler } from "sst/node/api";

console.log("Cold start!");

export const handler = ApiHandler(async () => {
  console.log("counting down...");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log("here we go");
  if (Math.random() > 0.5) {
    console.log("oh no we about to error");
    throw new Error("some stupid error");
  }
  console.log("we all good");
});
